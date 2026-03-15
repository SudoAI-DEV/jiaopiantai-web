import { db, schema } from '../db.js';
import { eq } from 'drizzle-orm';
import { getReferenceName } from './legacy-product-config.js';
import { isValidSceneId } from './scenes.js';

const {
  products,
  productSourceImages,
  aiGenerationTasks,
  taskQueue,
  customerModels,
} = schema;

export interface OrchestrationPayload {
  productId: string;
  aiGenerationTaskId: string;
  sourceImageIds?: string[];
  sourceImageUrls?: string[];
  sourceImageNotes?: string[];
  selectedImages?: string[];
  selectedImageNotes?: string[];
  modelImage?: string | null;
  customRequirements?: string[];
  clothingAnalysis?: unknown;
  scenePlan?: unknown;
  scene?: string | null;
}

export interface LoadedOrchestrationContext {
  product: typeof products.$inferSelect;
  aiGenerationTask: typeof aiGenerationTasks.$inferSelect;
  sourceImages: Array<typeof productSourceImages.$inferSelect>;
  sourceImageIds: string[];
  sourceImageUrls: string[];
  sourceImageNotes: string[];
  selectedModel: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string;
  } | null;
  modelImage: string | null;
  customRequirements: string[];
  scene: string;
}

interface QueueTaskLike {
  id: string;
  type: string;
  status: string;
  payload: unknown;
  result: unknown;
  referenceId: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

function normalizeStringArray(values?: string[] | null): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

function selectSourceImages(
  availableImages: Array<typeof productSourceImages.$inferSelect>,
  selectedImages?: string[]
) {
  if (!selectedImages || selectedImages.length === 0) {
    return availableImages;
  }

  const selectedNames = new Set(selectedImages.map((entry) => getReferenceName(entry)));
  const filtered = availableImages.filter((image) => {
    if (image.fileName && selectedNames.has(image.fileName)) {
      return true;
    }

    return selectedNames.has(getReferenceName(image.url));
  });

  return filtered.length > 0 ? filtered : availableImages;
}

export async function loadOrchestrationContext(
  payload: OrchestrationPayload
): Promise<LoadedOrchestrationContext> {
  const product = await db.query.products.findFirst({
    where: eq(products.id, payload.productId),
  });
  if (!product) {
    throw new Error(`Product ${payload.productId} not found`);
  }

  const aiGenerationTask = await db.query.aiGenerationTasks.findFirst({
    where: eq(aiGenerationTasks.id, payload.aiGenerationTaskId),
  });
  if (!aiGenerationTask) {
    throw new Error(`AI generation task ${payload.aiGenerationTaskId} not found`);
  }

  const boundModel = product.modelId
    ? await db.query.customerModels.findFirst({
        where: eq(customerModels.id, product.modelId),
      })
    : null;

  if (product.modelId) {
    if (!boundModel) {
      throw new Error(`Bound model ${product.modelId} not found for product ${product.id}`);
    }

    if (boundModel.userId !== product.userId) {
      throw new Error(`Bound model ${product.modelId} does not belong to product owner`);
    }
  }

  const availableImages = await db.query.productSourceImages.findMany({
    where: eq(productSourceImages.productId, payload.productId),
  });
  if (availableImages.length === 0) {
    throw new Error(`Product ${payload.productId} has no source images`);
  }

  const sourceImages = selectSourceImages(
    availableImages,
    normalizeStringArray(payload.selectedImages)
  );

  const sourceImageIds = sourceImages.map((image) => image.id);
  const sourceImageUrls = sourceImages.map((image) => image.url);
  const payloadNotes = normalizeStringArray(payload.sourceImageNotes);
  const selectedNotes = normalizeStringArray(payload.selectedImageNotes);
  const sourceImageNotes = payloadNotes.length > 0
    ? payloadNotes
    : selectedNotes.length > 0
      ? selectedNotes
      : sourceImages.map((image) => image.fileName || getReferenceName(image.url));
  const selectedModel = boundModel
    ? {
        id: boundModel.id,
        name: boundModel.name,
        description: boundModel.description ?? null,
        imageUrl: boundModel.imageUrl,
      }
    : null;
  const fallbackModelImage = payload.modelImage?.trim() || null;

  return {
    product,
    aiGenerationTask,
    sourceImages,
    sourceImageIds,
    sourceImageUrls,
    sourceImageNotes,
    selectedModel,
    modelImage: selectedModel?.imageUrl || fallbackModelImage,
    customRequirements: normalizeStringArray(payload.customRequirements),
    scene: resolveScene(payload.scene, product.category, product.stylePreference),
  };
}

function resolveScene(
  payloadScene: string | null | undefined,
  category: string | null,
  stylePreference: string | null,
): string {
  const candidates = [payloadScene?.trim(), stylePreference, category];
  for (const c of candidates) {
    if (c && isValidSceneId(c)) return c;
  }
  return 'country-garden';
}

export async function loadRecentSiblingScenePlans(params: {
  productId: string;
  scene: string;
  limit?: number;
}) {
  const [allTasks, allProducts] = await Promise.all([
    db.query.taskQueue.findMany({
      where: eq(taskQueue.type, 'scene_planning'),
    }),
    db.query.products.findMany(),
  ]);

  const currentProduct = allProducts.find((product) => product.id === params.productId);
  if (!currentProduct) {
    return [];
  }

  const productsById = new Map(allProducts.map((product) => [product.id, product]));

  return allTasks
    .filter((task) => task.referenceType === 'product')
    .filter((task) => task.referenceId && task.referenceId !== params.productId)
    .filter((task) => task.status === 'completed' && task.result)
    .filter((task) => {
      const siblingProduct = task.referenceId
        ? productsById.get(task.referenceId)
        : null;
      if (!siblingProduct) {
        return false;
      }

      return (
        siblingProduct.userId === currentProduct.userId &&
        siblingProduct.category === currentProduct.category
      );
    })
    .filter((task) => {
      const payloadScene = (task.payload as Record<string, any> | null)?.scene;
      const resultScene = (task.result as Record<string, any> | null)?.metadata?.scene;
      const candidate = typeof resultScene === 'string'
        ? resultScene
        : typeof payloadScene === 'string'
          ? payloadScene
          : null;

      return candidate === null || candidate === params.scene;
    })
    .sort((left, right) => {
      const rightTime = new Date(right.completedAt || right.createdAt).getTime();
      const leftTime = new Date(left.completedAt || left.createdAt).getTime();
      return rightTime - leftTime;
    })
    .slice(0, params.limit ?? 4)
    .map((task) => ({
      taskId: task.id,
      result: task.result,
    }));
}

function matchesGenerationTask(task: QueueTaskLike, aiGenerationTaskId: string): boolean {
  const payloadTaskId = (task.payload as Record<string, any> | null)?.aiGenerationTaskId;
  if (typeof payloadTaskId === 'string' && payloadTaskId === aiGenerationTaskId) {
    return true;
  }

  const resultTaskId = (task.result as Record<string, any> | null)?.metadata?.aiGenerationTaskId;
  return typeof resultTaskId === 'string' && resultTaskId === aiGenerationTaskId;
}

export async function loadLatestCompletedTaskResult<T>(params: {
  productId: string;
  aiGenerationTaskId: string;
  type: string;
}): Promise<T | null> {
  const tasks = await db.query.taskQueue.findMany();
  const match = tasks
    .filter((task) => task.referenceType === 'product')
    .filter((task) => task.referenceId === params.productId)
    .filter((task) => task.type === params.type)
    .filter((task) => task.status === 'completed' && task.result)
    .filter((task) => matchesGenerationTask(task as QueueTaskLike, params.aiGenerationTaskId))
    .sort((left, right) => {
      const rightTime = new Date(right.completedAt || right.createdAt).getTime();
      const leftTime = new Date(left.completedAt || left.createdAt).getTime();
      return rightTime - leftTime;
    })[0];

  return (match?.result as T | undefined) ?? null;
}
