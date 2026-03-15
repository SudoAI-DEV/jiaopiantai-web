import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, schema } from '../db.js';
import { enqueueTask } from '../queue.js';
import { runStructuredObjectGeneration } from '../lib/ai-sdk.js';
import { loadImageAssetBuffer } from '../lib/input-assets.js';
import {
  loadLatestCompletedTaskResult,
  loadOrchestrationContext,
  type OrchestrationPayload,
} from '../lib/orchestration-context.js';
import {
  clothingAnalysisSchema,
  type ClothingAnalysisResult,
} from '../lib/orchestration-schemas.js';
import { getSceneById } from '../lib/scenes.js';

const { productSourceImages, products, aiGenerationTasks } = schema;
const DEFAULT_CLOTHING_ANALYSIS_MODEL = 'gemini-3-flash-preview';

function getReferenceName(reference: string): string {
  const trimmed = reference.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || trimmed;
  } catch {
    const parts = trimmed.split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] || trimmed;
  }
}

function buildAnalysisInstructions(context: Awaited<ReturnType<typeof loadOrchestrationContext>>) {
  const selectedScene = getSceneById(context.scene);

  return [
    '你是电商服装编排系统里的 clothing analysis worker。',
    '目标不是抽象审美标签，而是输出后续 10 镜头规划可直接消费的服装语义。',
    '请严格输出 schema 对应的结构化对象，不要输出 markdown。',
    '',
    `产品名称：${context.product.name}`,
    `品类：${context.product.category}`,
    `目标场景ID：${context.scene}`,
    selectedScene?.name ? `目标场景：${selectedScene.name}` : '',
    selectedScene?.description ? `场景说明：${selectedScene.description}` : '',
    context.product.shootingRequirements
      ? `拍摄要求：${context.product.shootingRequirements}`
      : '',
    context.product.specialNotes ? `特殊说明：${context.product.specialNotes}` : '',
    '',
    '请特别识别并总结：',
    '1. 每张源图的角色，例如正面整体、背面整体、细节、下装、平铺',
    '2. 服装总纲：品类、颜色、面料、版型、长度',
    '3. 正反面差异',
    '4. 必须保留的结构和装饰元素',
    '5. 前面专属细节、背面专属细节',
    '6. 最容易生成错误的点',
    '',
    'selectedSources 必须覆盖当前输入的所有源图，并保持 reference 为输入图片文件名或 URL basename。',
    'imageDescriptions 必须覆盖当前输入的所有源图。',
  ].filter(Boolean).join('\n');
}

function findDescriptionForImage(
  result: ClothingAnalysisResult,
  image: typeof productSourceImages.$inferSelect
) {
  const candidates = [image.fileName, getReferenceName(image.url)].filter(Boolean);
  return result.imageDescriptions.find((entry) => candidates.includes(getReferenceName(entry.file)));
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

  const content: Array<
    | {
        type: 'text';
        text: string;
      }
    | {
        type: 'image';
        image: Buffer;
        mediaType: string;
      }
  > = [
    {
      type: 'text',
      text: buildAnalysisInstructions(context),
    },
  ];

  for (let index = 0; index < context.sourceImages.length; index++) {
    const sourceImage = context.sourceImages[index];
    const note = context.sourceImageNotes[index] || '未标注';
    const asset = await loadImageAssetBuffer(sourceImage.url);

    content.push({
      type: 'text',
      text: `源图 ${index + 1}\n文件名：${sourceImage.fileName || getReferenceName(sourceImage.url)}\n说明：${note}`,
    });
    content.push({
      type: 'image',
      image: asset.data,
      mediaType: asset.mimeType,
    });
  }

  return runStructuredObjectGeneration<ClothingAnalysisResult>({
    modelId:
      process.env.GEMINI_CLOTHING_ANALYSIS_MODEL || DEFAULT_CLOTHING_ANALYSIS_MODEL,
    schema: clothingAnalysisSchema,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
  });
}

export async function handleClothingAnalysis(payload: OrchestrationPayload): Promise<ClothingAnalysisResult> {
  const context = await loadOrchestrationContext(payload);
  const now = new Date();

  await db
    .update(aiGenerationTasks)
    .set({
      status: 'processing',
      startedAt: now,
      updatedAt: now,
    })
    .where(eq(aiGenerationTasks.id, context.aiGenerationTask.id));

  await db
    .update(products)
    .set({
      status: 'analyzing',
      updatedAt: now,
    })
    .where(eq(products.id, context.product.id));

  const result = await resolveClothingAnalysis(payload, context);

  for (const sourceImage of context.sourceImages) {
    const description = findDescriptionForImage(result, sourceImage);
    await db
      .update(productSourceImages)
      .set({
        analysis: description
          ? {
              role: description.role,
              description: description.description,
              visibleDetails: description.visibleDetails,
            }
          : {
              summary: result.clothingSummary,
            },
        analyzedAt: now,
      })
      .where(eq(productSourceImages.id, sourceImage.id));
  }

  await enqueueTask({
    id: nanoid(),
    type: 'scene_planning',
    payload: {
      productId: context.product.id,
      aiGenerationTaskId: context.aiGenerationTask.id,
      scene: context.scene,
      sourceImageIds: context.sourceImageIds,
      sourceImageUrls: context.sourceImageUrls,
      sourceImageNotes: context.sourceImageNotes,
      clothingAnalysis: result,
    },
    referenceId: context.product.id,
    referenceType: 'product',
    priority: 10,
  });

  return result;
}
