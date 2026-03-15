import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./db";
import { isValidSceneId } from "./scenes";
import {
  aiGenerationTasks,
  creditTransactions,
  productSourceImages,
  products,
  taskQueue,
  userProfiles,
} from "./db/schema";
import {
  getOwnedCustomerModel,
  pickRandomActiveCustomerModel,
} from "./customer-models";

let taskLifecycleDb = db;

export class TaskLifecycleError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "TaskLifecycleError";
  }
}

export function setTaskLifecycleDbForTests(nextDb: typeof db | null) {
  taskLifecycleDb = nextDb ?? db;
}

async function resolveBoundModelId(params: {
  product: typeof products.$inferSelect;
  userId: string;
}) {
  const { product, userId } = params;

  if (product.modelId) {
    const boundModel = await getOwnedCustomerModel(taskLifecycleDb, {
      userId,
      modelId: product.modelId,
    });

    if (!boundModel) {
      throw new TaskLifecycleError("Bound model does not belong to current customer", 400);
    }

    return boundModel.id;
  }

  const randomModel = await pickRandomActiveCustomerModel(taskLifecycleDb, userId);
  if (!randomModel) {
    throw new TaskLifecycleError("Please upload at least one active model before submitting", 400);
  }

  return randomModel.id;
}

export async function submitProductToQueue(params: {
  productId: string;
  userId: string;
}) {
  const { productId, userId } = params;

  const product = await taskLifecycleDb.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.userId, userId)),
  });

  if (!product) {
    throw new TaskLifecycleError("Product not found", 404);
  }

  if (product.status !== "draft") {
    throw new TaskLifecycleError("Product already submitted", 400);
  }

  const profile = await taskLifecycleDb.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });

  if (!profile || (profile.creditsBalance || 0) < 1) {
    throw new TaskLifecycleError("Insufficient credits", 400);
  }

  const sourceImages = await taskLifecycleDb.query.productSourceImages.findMany({
    where: eq(productSourceImages.productId, productId),
  });

  if (sourceImages.length === 0) {
    throw new TaskLifecycleError("Please upload at least one product image", 400);
  }

  const modelId = await resolveBoundModelId({ product, userId });
  const persistedSceneId = [product.selectedSceneId, product.scenePreference].find(
    (value): value is string => typeof value === "string" && isValidSceneId(value)
  );
  if (!persistedSceneId) {
    throw new TaskLifecycleError("Please select a valid scene before submitting", 400);
  }
  const now = new Date();
  const aiTaskId = nanoid();

  await taskLifecycleDb.transaction(async (tx) => {
    await tx
      .update(userProfiles)
      .set({
        creditsBalance: (profile.creditsBalance || 0) - 1,
        creditsFrozen: (profile.creditsFrozen || 0) + 1,
      })
      .where(eq(userProfiles.userId, userId));

    await tx.insert(creditTransactions).values({
      id: nanoid(),
      userId,
      type: "submission",
      amount: -1,
      balanceAfter: (profile.creditsBalance || 0) - 1,
      referenceId: productId,
      description: `提交产品: ${product.name}`,
      createdAt: now,
    });

    await tx.insert(aiGenerationTasks).values({
      id: aiTaskId,
      productId,
      status: "pending",
      targetCount: 10,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(taskQueue).values({
      id: nanoid(),
      type: "clothing_analysis",
      status: "pending",
      priority: 10,
      payload: {
        productId,
        aiGenerationTaskId: aiTaskId,
        sourceImageIds: sourceImages.map((img) => img.id),
        sourceImageUrls: sourceImages.map((img) => img.url),
        scene: persistedSceneId,
      },
      referenceId: productId,
      referenceType: "product",
      attemptCount: 0,
      maxAttempts: 3,
      availableAt: now,
      createdAt: now,
    });

    await tx
      .update(products)
      .set({
        status: "submitted",
        modelId,
        updatedAt: now,
      })
      .where(eq(products.id, productId));
  });

  return {
    aiGenerationTaskId: aiTaskId,
    modelId,
    productId,
    productStatus: "submitted" as const,
  };
}

export async function cancelPendingProductTask(params: {
  productId: string;
  userId: string;
}) {
  const { productId, userId } = params;

  const product = await taskLifecycleDb.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.userId, userId)),
  });

  if (!product) {
    throw new TaskLifecycleError("Product not found", 404);
  }

  const profile = await taskLifecycleDb.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });

  if (!profile) {
    throw new TaskLifecycleError("User profile not found", 404);
  }

  const queueItems = await taskLifecycleDb.query.taskQueue.findMany({
    where: and(
      eq(taskQueue.referenceId, productId),
      eq(taskQueue.referenceType, "product")
    ),
  });

  const pendingQueueItems = queueItems.filter((task) => task.status === "pending");
  if (pendingQueueItems.length === 0) {
    throw new TaskLifecycleError("No pending task to cancel", 400);
  }

  const aiTasks = await taskLifecycleDb.query.aiGenerationTasks.findMany({
    where: eq(aiGenerationTasks.productId, productId),
  });
  const latestTask = aiTasks
    .slice()
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )[0];

  if (!latestTask || !["pending", "queued"].includes(latestTask.status || "")) {
    throw new TaskLifecycleError("No cancellable AI task found", 400);
  }

  const now = new Date();

  await taskLifecycleDb.transaction(async (tx) => {
    await tx
      .update(taskQueue)
      .set({
        status: "cancelled",
        completedAt: now,
        lockedAt: null,
        lockedBy: null,
      })
      .where(
        and(
          eq(taskQueue.referenceId, productId),
          eq(taskQueue.referenceType, "product"),
          eq(taskQueue.status, "pending")
        )
      );

    await tx
      .update(aiGenerationTasks)
      .set({
        status: "cancelled",
        errorMessage: "Cancelled by user",
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(aiGenerationTasks.id, latestTask.id));

    await tx
      .update(userProfiles)
      .set({
        creditsFrozen: Math.max((profile.creditsFrozen || 0) - 1, 0),
        creditsBalance: (profile.creditsBalance || 0) + 1,
        updatedAt: now,
      })
      .where(eq(userProfiles.userId, userId));

    await tx.insert(creditTransactions).values({
      id: nanoid(),
      userId,
      type: "refund",
      amount: 1,
      balanceAfter: (profile.creditsBalance || 0) + 1,
      referenceId: productId,
      description: `取消任务退款: ${product.name}`,
      createdAt: now,
    });

    await tx
      .update(products)
      .set({
        status: "cancelled",
        updatedAt: now,
      })
      .where(eq(products.id, productId));
  });

  return {
    aiGenerationTaskId: latestTask.id,
    cancelledTaskCount: pendingQueueItems.length,
    productId,
    productStatus: "cancelled" as const,
  };
}
