import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, schema } from '../db.js';
import { runImageGeneration, getImageModel } from '../lib/ai-sdk.js';
import { loadImageAssetBuffer } from '../lib/input-assets.js';
import { getPublicUrl } from '../../../src/lib/r2';
import {
  clothingAnalysisSchema,
  scenePlanSchema,
  ClothingAnalysisResult,
  ScenePlanResult,
} from '../lib/orchestration-schemas.js';
import {
  loadLatestCompletedTaskResult,
  loadOrchestrationContext,
  type OrchestrationPayload,
} from '../lib/orchestration-context.js';

const {
  productGeneratedImages,
  aiGenerationTasks,
  products,
  userProfiles,
  creditTransactions,
} = schema;
let uploadToR2ForTests:
  | ((buffer: Buffer, key: string, mimeType: string) => Promise<string>)
  | null = null;
const DEFAULT_SCENE_RENDER_TIMEOUT_MS = 180_000;

function createRetryableError(message: string): Error {
  const error = new Error(message);
  (error as Error & { status?: number }).status = 503;
  return error;
}

function getSceneRenderTimeoutMs(): number {
  const rawTimeout = Number.parseInt(process.env.SCENE_RENDER_TIMEOUT_MS || '', 10);
  return Number.isFinite(rawTimeout) && rawTimeout > 0
    ? rawTimeout
    : DEFAULT_SCENE_RENDER_TIMEOUT_MS;
}

function getS3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

async function uploadToR2(buffer: Buffer, key: string, mimeType: string): Promise<string> {
  if (uploadToR2ForTests) {
    return uploadToR2ForTests(buffer, key, mimeType);
  }

  const s3 = getS3Client();
  const bucket = process.env.R2_BUCKET_NAME || 'jiaopiantai';

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  const publicDomain = process.env.R2_PUBLIC_DOMAIN;
  return publicDomain ? `${publicDomain.replace(/\/+$/, '')}/${key}` : getPublicUrl(key);
}

async function runSceneImageGenerationWithTimeout(
  sceneId: number,
  request: Parameters<typeof runImageGeneration>[0]
) {
  const timeoutMs = getSceneRenderTimeoutMs();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(createRetryableError(`Scene ${sceneId} timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    return await runImageGeneration({
      ...request,
      abortSignal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted && controller.signal.reason instanceof Error) {
      throw controller.signal.reason;
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildConstraintBlock(title: string, values?: string[]) {
  if (!values || values.length === 0) {
    return '';
  }

  return [`【${title}】`, ...values.map((value) => `- ${value}`)].join('\n');
}

function buildSceneRenderPrompt(params: {
  scene: ScenePlanResult['scenes'][number];
  scenePlan: ScenePlanResult;
  clothingAnalysis: ClothingAnalysisResult;
  sourceImageNotes: string[];
  selectedModel?: {
    name: string;
    description?: string | null;
  } | null;
  hasModelImage: boolean;
}) {
  const {
    scene,
    scenePlan,
    clothingAnalysis,
    sourceImageNotes,
    selectedModel,
    hasModelImage,
  } = params;

  return [
    scene.fullPrompt,
    '',
    `服装总纲：${scenePlan.clothingDescription}`,
    `镜头类型：${scene.shotName}`,
    `场景锚点：${scene.sceneFamily} / ${scene.microLocation}`,
    selectedModel?.name ? `绑定模特：${selectedModel.name}` : '',
    selectedModel?.description ? `模特描述：${selectedModel.description}` : '',
    buildConstraintBlock('必须保留的关键细节', scene.requiredDetails),
    buildConstraintBlock('正面必须出现的细节', scene.frontRequiredDetails),
    buildConstraintBlock('仅背面允许的细节', scene.backOnlyDetails),
    buildConstraintBlock('下装必须保留的细节', scene.bottomRequiredDetails),
    buildConstraintBlock('禁止出现的错误', scene.forbiddenDetails),
    buildConstraintBlock('整体必须保留的服装要点', clothingAnalysis.mustShowDetails),
    buildConstraintBlock('前面专属细节', clothingAnalysis.frontOnlyDetails),
    buildConstraintBlock('背面专属细节', clothingAnalysis.backOnlyDetails),
    buildConstraintBlock('高风险错误', clothingAnalysis.forbiddenMistakes),
    buildConstraintBlock('当前输入源图说明', sourceImageNotes),
    hasModelImage
      ? '最后一张参考图是模特身份参考图，只用于锁定人物身份与体态一致性。'
      : '',
  ].filter(Boolean).join('\n\n');
}

function selectSceneSourceNotes(
  scene: ScenePlanResult['scenes'][number],
  sourceImageNotes: string[]
) {
  return scene.sourceImageIndexes.map((index) => sourceImageNotes[index - 1] || `源图 ${index}`);
}

async function resolveScenePlan(
  payload: OrchestrationPayload,
  context: Awaited<ReturnType<typeof loadOrchestrationContext>>
): Promise<ScenePlanResult> {
  const payloadResult = scenePlanSchema.safeParse(payload.scenePlan);
  if (payloadResult.success) {
    return payloadResult.data;
  }

  const historicalResult = await loadLatestCompletedTaskResult<unknown>({
    productId: context.product.id,
    aiGenerationTaskId: context.aiGenerationTask.id,
    type: 'scene_planning',
  });
  const historicalParse = scenePlanSchema.safeParse(historicalResult);
  if (historicalParse.success) {
    return historicalParse.data;
  }

  throw new Error(`Scene plan not found for ${context.aiGenerationTask.id}`);
}

async function resolveClothingAnalysis(
  payload: OrchestrationPayload,
  context: Awaited<ReturnType<typeof loadOrchestrationContext>>
): Promise<ClothingAnalysisResult> {
  const payloadResult = clothingAnalysisSchema.safeParse(payload.clothingAnalysis);
  if (payloadResult.success) {
    return payloadResult.data;
  }

  const historicalResult = await loadLatestCompletedTaskResult<unknown>({
    productId: context.product.id,
    aiGenerationTaskId: context.aiGenerationTask.id,
    type: 'clothing_analysis',
  });
  const historicalParse = clothingAnalysisSchema.safeParse(historicalResult);
  if (historicalParse.success) {
    return historicalParse.data;
  }

  throw new Error(`Clothing analysis result not found for ${context.aiGenerationTask.id}`);
}

export async function handleSceneRender(payload: OrchestrationPayload) {
  const context = await loadOrchestrationContext(payload);
  const productId = context.product.id;
  const aiGenerationTaskId = context.aiGenerationTask.id;
  const scenePlan = await resolveScenePlan(payload, context);
  const clothingAnalysis = await resolveClothingAnalysis(payload, context);
  const sourceImageUrls = payload.sourceImageUrls && payload.sourceImageUrls.length > 0
    ? payload.sourceImageUrls
    : scenePlan.metadata.sourceImageUrls.length > 0
      ? scenePlan.metadata.sourceImageUrls
      : context.sourceImageUrls;
  const sourceImageNotes = payload.sourceImageNotes && payload.sourceImageNotes.length > 0
    ? payload.sourceImageNotes
    : scenePlan.metadata.sourceImageNotes.length > 0
      ? scenePlan.metadata.sourceImageNotes
      : context.sourceImageNotes;
  const selectedModel = context.selectedModel || scenePlan.metadata.selectedModel || null;
  if (!selectedModel) {
    throw new Error(`Product ${productId} is missing a bound model`);
  }

  const genTask = await db.query.aiGenerationTasks.findFirst({
    where: eq(aiGenerationTasks.id, aiGenerationTaskId),
  });
  if (!genTask) {
    throw new Error(`AI generation task ${aiGenerationTaskId} not found`);
  }

  if (genTask.status === 'completed' || genTask.status === 'cancelled') {
    return { generatedCount: 0, scenes: [] };
  }

  const product = context.product;

  const now = new Date();
  await db
    .update(aiGenerationTasks)
    .set({ status: 'processing', startedAt: now, updatedAt: now })
    .where(eq(aiGenerationTasks.id, aiGenerationTaskId));

  await db
    .update(products)
    .set({ status: 'rendering', updatedAt: now })
    .where(eq(products.id, productId));

  const existingImages = await db.query.productGeneratedImages.findMany({
    where: eq(productGeneratedImages.generationTaskId, aiGenerationTaskId),
  });
  const allGeneratedImagesForProduct = await db.query.productGeneratedImages.findMany({
    where: eq(productGeneratedImages.productId, productId),
  });
  const currentBatchNumber = existingImages.find((image) => typeof image.batchNumber === 'number')?.batchNumber
    || (
      allGeneratedImagesForProduct.reduce((maxBatch, image) => {
        if (typeof image.batchNumber !== 'number') {
          return maxBatch;
        }

        return Math.max(maxBatch, image.batchNumber);
      }, 0) + 1
    );
  const completedSceneMap = new Map(
    existingImages
      .filter((image) => typeof image.sortOrder === 'number')
      .map((image) => [
        image.sortOrder as number,
        {
          sceneId: image.sortOrder as number,
          shotName: `scene-${image.sortOrder}`,
          url: image.url,
          thumbnailUrl: image.thumbnailUrl || image.url,
        },
      ])
  );
  const generatedImages = Array.from(completedSceneMap.values());
  const failedScenes: Array<{ sceneId: number; shotName: string; errorMessage: string }> = [];

  for (const scene of scenePlan.scenes) {
    if (completedSceneMap.has(scene.id)) {
      continue;
    }

    try {
      const sceneImages: Uint8Array[] = [];
      for (const index of scene.sourceImageIndexes) {
        const reference = sourceImageUrls[index - 1];
        if (!reference) {
          throw new Error(`Scene ${scene.id} references missing source image index ${index}`);
        }

        const asset = await loadImageAssetBuffer(reference);
        sceneImages.push(asset.data);
      }

      const modelAsset = await loadImageAssetBuffer(selectedModel.imageUrl);
      sceneImages.push(modelAsset.data);

      const prompt = buildSceneRenderPrompt({
        scene,
        scenePlan,
        clothingAnalysis,
        sourceImageNotes: selectSceneSourceNotes(scene, sourceImageNotes),
        selectedModel,
        hasModelImage: true,
      });

      const result = await runSceneImageGenerationWithTimeout(scene.id, {
        model: getImageModel(),
        prompt: {
          text: prompt,
          images: sceneImages,
        },
        n: 1,
        aspectRatio: '3:4',
        seed: scene.seed,
        providerOptions: {
          google: {
            imageSize: '2K',
          },
        },
        maxRetries: 2,
      });

      const image = result.images[0];
      if (!image) {
        throw new Error(`Scene ${scene.id} returned no image`);
      }

      const buffer = Buffer.from(image.uint8Array);
      const extension = image.mediaType === 'image/png' ? 'png' : 'jpg';
      const key = `generated/${product.userId}/${productId}/scene-${String(scene.id).padStart(2, '0')}.${extension}`;
      const url = await uploadToR2(buffer, key, image.mediaType);

      const generatedImage = {
        sceneId: scene.id,
        shotName: scene.shotName,
        url,
        thumbnailUrl: url,
      };

      await db.insert(productGeneratedImages).values({
        id: nanoid(),
        productId,
        generationTaskId: aiGenerationTaskId,
        url: generatedImage.url,
        thumbnailUrl: generatedImage.thumbnailUrl,
        batchNumber: currentBatchNumber,
        reviewStatus: 'pending',
        sortOrder: generatedImage.sceneId,
        createdAt: new Date(),
      });

      generatedImages.push(generatedImage);
      completedSceneMap.set(scene.id, generatedImage);
    } catch (error) {
      failedScenes.push({
        sceneId: scene.id,
        shotName: scene.shotName,
        errorMessage: error instanceof Error ? error.message : 'Unknown scene render error',
      });
    }
  }

  if (generatedImages.length === 0) {
    throw createRetryableError('All scene renders failed');
  }

  const allScenesCompleted = generatedImages.length >= scenePlan.scenes.length;

  if (!allScenesCompleted || failedScenes.length > 0) {
    await db.transaction(async (tx) => {
      await tx
        .update(aiGenerationTasks)
        .set({
          status: 'processing',
          completedCount: generatedImages.length,
          resultCount: generatedImages.length,
          updatedAt: now,
          errorMessage: failedScenes
            .map((entry) => `scene ${entry.sceneId}: ${entry.errorMessage}`)
            .join('; '),
        })
        .where(eq(aiGenerationTasks.id, aiGenerationTaskId));
    });

    throw createRetryableError(
      `Scene render incomplete. Completed ${generatedImages.length}/${scenePlan.scenes.length} scenes.`
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(aiGenerationTasks)
      .set({
        status: 'completed',
        resultCount: generatedImages.length,
        completedCount: generatedImages.length,
        completedAt: now,
        updatedAt: now,
        errorMessage: null,
      })
      .where(eq(aiGenerationTasks.id, aiGenerationTaskId));

    await tx
      .update(products)
      .set({ status: 'reviewing', updatedAt: now })
      .where(eq(products.id, productId));

    const userProfile = await tx.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, product.userId),
    });

    if (userProfile) {
      await tx
        .update(userProfiles)
        .set({
          creditsFrozen: Math.max((userProfile.creditsFrozen || 0) - 1, 0),
          creditsTotalSpent: (userProfile.creditsTotalSpent || 0) + 1,
          updatedAt: now,
        })
        .where(eq(userProfiles.userId, product.userId));

      await tx.insert(creditTransactions).values({
        id: nanoid(),
        userId: product.userId,
        type: 'settlement',
        amount: -1,
        balanceAfter: userProfile.creditsBalance || 0,
        referenceId: productId,
        description: `AI 场景渲染完成结算: ${product.name}`,
        createdAt: now,
      });
    }
  });

  return {
    generatedCount: generatedImages.length,
    scenes: generatedImages,
    failedScenes,
  };
}

export function setUploadToR2ForTests(
  factory: ((buffer: Buffer, key: string, mimeType: string) => Promise<string>) | null
): void {
  uploadToR2ForTests = factory;
}
