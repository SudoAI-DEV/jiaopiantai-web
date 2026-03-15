import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, schema } from '../db.js';
import { enqueueTask } from '../queue.js';
import { runStructuredObjectGeneration } from '../lib/ai-sdk.js';
import {
  loadLatestCompletedTaskResult,
  loadOrchestrationContext,
  loadRecentSiblingScenePlans,
  type OrchestrationPayload,
} from '../lib/orchestration-context.js';
import {
  clothingAnalysisSchema,
  scenePlanSchema,
  type ClothingAnalysisResult,
  type ScenePlanResult,
} from '../lib/orchestration-schemas.js';
import { getSceneById } from '../lib/scenes.js';

const { products, aiGenerationTasks } = schema;

function buildPlanningPrompt(params: {
  context: Awaited<ReturnType<typeof loadOrchestrationContext>>;
  clothingAnalysis: ClothingAnalysisResult;
  siblingPlans: Array<{ taskId: string; result: unknown }>;
}) {
  const { context, clothingAnalysis, siblingPlans } = params;
  const selectedScene = getSceneById(context.scene);

  return [
    '你是电商服装编排系统里的 scene planning worker。',
    '请基于服装语义生成固定 10 镜头 scene plan。',
    '不是写通用 prompt 列表，而是输出可直接给渲染层消费的镜头结构。',
    '',
    `产品名称：${context.product.name}`,
    `品类：${context.product.category}`,
    `目标场景ID：${context.scene}`,
    `目标场景：${selectedScene?.name ?? context.scene}`,
    selectedScene?.description ? `场景说明：${selectedScene.description}` : '',
    selectedScene?.sceneRef ? `场景参考模板：${selectedScene.sceneRef}` : '',
    context.selectedModel ? `绑定模特：${context.selectedModel.name}` : '',
    context.selectedModel?.description
      ? `模特描述：${context.selectedModel.description}`
      : '',
    context.selectedModel?.imageUrl
      ? `模特参考图：${context.selectedModel.imageUrl}`
      : '',
    context.product.shootingRequirements
      ? `拍摄要求：${context.product.shootingRequirements}`
      : '',
    context.product.specialNotes ? `特殊说明：${context.product.specialNotes}` : '',
    '',
    '强制规则：',
    '1. 总共 10 个 scenes。',
    '2. 1-5 为 full_body，6-10 为 close_up。',
    '3. 每个 scene 必须包含 sourceImageIndexes、requiredDetails、forbiddenDetails。',
    '4. 所有 scenes 必须服务于卖衣服，而不是展示风景。',
    '5. fullPrompt 必须是最终可直接用于图像生成的完整 prompt。',
    '6. 必须尽量避免与历史 sibling plans 高频重复。',
    '',
    `服装语义：${JSON.stringify(clothingAnalysis)}`,
    siblingPlans.length > 0
      ? `历史 sibling plans 摘要：${JSON.stringify(siblingPlans.map((entry) => entry.result))}`
      : '历史 sibling plans 摘要：[]',
  ].filter(Boolean).join('\n');
}

function buildAvoidRepeatingSummary(siblingPlans: Array<{ taskId: string; result: unknown }>) {
  return siblingPlans.flatMap((entry) => {
    const scenes = (entry.result as Record<string, any> | null)?.scenes;
    if (!Array.isArray(scenes)) {
      return [];
    }

    return scenes
      .slice(0, 5)
      .map((scene) => {
        const family = typeof scene?.sceneFamily === 'string' ? scene.sceneFamily : 'unknown-family';
        const location = typeof scene?.microLocation === 'string' ? scene.microLocation : 'unknown-location';
        return `${family}/${location}`;
      });
  });
}

function normalizeSourceImageIndexes(
  indexes: unknown,
  sourceImageCount: number
): number[] {
  if (!Array.isArray(indexes)) {
    return [1];
  }

  const numericIndexes = indexes
    .map((value) => typeof value === 'number' ? value : Number(value))
    .filter((value) => Number.isInteger(value));

  if (numericIndexes.length === 0) {
    return [1];
  }

  const usesZeroBasedIndexes = numericIndexes.some((value) => value === 0);
  const normalizedIndexes = numericIndexes
    .map((value) => usesZeroBasedIndexes ? value + 1 : value)
    .filter((value) => value >= 1 && value <= sourceImageCount);

  return Array.from(new Set(normalizedIndexes)).length > 0
    ? Array.from(new Set(normalizedIndexes))
    : [1];
}

function normalizeGeneratedScenePlanObject(
  generated: unknown,
  sourceImageCount: number
): Record<string, unknown> {
  if (!generated || typeof generated !== 'object') {
    return {};
  }

  const candidate = generated as Record<string, unknown>;
  const scenes = Array.isArray(candidate.scenes)
    ? candidate.scenes.map((scene) => {
        if (!scene || typeof scene !== 'object') {
          return scene;
        }

        return {
          ...(scene as Record<string, unknown>),
          sourceImageIndexes: normalizeSourceImageIndexes(
            (scene as Record<string, unknown>).sourceImageIndexes,
            sourceImageCount
          ),
        };
      })
    : candidate.scenes;

  return {
    ...candidate,
    scenes,
  };
}

function repairScenePlanText(
  rawText: string,
  sourceImageCount: number
): string | null {
  try {
    const candidate = normalizeGeneratedScenePlanObject(
      JSON.parse(rawText),
      sourceImageCount
    );
    return JSON.stringify(candidate);
  } catch {
    return null;
  }
}

async function resolveClothingAnalysis(
  payload: OrchestrationPayload,
  context: Awaited<ReturnType<typeof loadOrchestrationContext>>
) {
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

export async function handleScenePlanning(payload: OrchestrationPayload & {
  clothingAnalysis?: ClothingAnalysisResult;
}): Promise<ScenePlanResult> {
  const context = await loadOrchestrationContext(payload);
  const now = new Date();

  await db
    .update(products)
    .set({
      status: 'planning',
      updatedAt: now,
    })
    .where(eq(products.id, context.product.id));

  await db
    .update(aiGenerationTasks)
    .set({
      status: 'processing',
      updatedAt: now,
    })
    .where(eq(aiGenerationTasks.id, context.aiGenerationTask.id));

  const siblingPlans = await loadRecentSiblingScenePlans({
    productId: context.product.id,
    scene: context.scene,
    limit: 4,
  });
  const clothingAnalysis = await resolveClothingAnalysis(payload, context);
  const avoidRepeating = buildAvoidRepeatingSummary(siblingPlans);

  const generated = await runStructuredObjectGeneration<ScenePlanResult>({
    schema: scenePlanSchema,
    modelId: process.env.GEMINI_SCENE_PLANNING_MODEL || process.env.GEMINI_TEXT_MODEL,
    messages: [
      {
        role: 'user',
        content: buildPlanningPrompt({
          context,
          clothingAnalysis,
          siblingPlans,
        }),
      },
    ],
    repairText: async ({ text }) => repairScenePlanText(text, context.sourceImageUrls.length),
  });
  const normalizedGenerated = normalizeGeneratedScenePlanObject(
    generated,
    context.sourceImageUrls.length
  );

  const result = scenePlanSchema.parse({
    ...normalizedGenerated,
    metadata: {
      productId: context.product.id,
      aiGenerationTaskId: context.aiGenerationTask.id,
      scene: context.scene,
      sourceImageIds: context.sourceImageIds,
      sourceImageUrls: context.sourceImageUrls,
      sourceImageNotes: context.sourceImageNotes,
      selectedModel: context.selectedModel || undefined,
      batchDiversityContext: {
        siblingsChecked: siblingPlans.map((entry) => entry.taskId),
        avoidRepeating,
      },
    },
  });

  await enqueueTask({
    id: nanoid(),
    type: 'scene_render',
    payload: {
      productId: context.product.id,
      aiGenerationTaskId: context.aiGenerationTask.id,
      scenePlan: result,
      clothingAnalysis,
      sourceImageUrls: context.sourceImageUrls,
      sourceImageNotes: context.sourceImageNotes,
    },
    referenceId: context.product.id,
    referenceType: 'product',
    priority: 10,
  });

  return result;
}
