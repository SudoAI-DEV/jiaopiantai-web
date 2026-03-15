"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskLifecycleError = void 0;
exports.normalizeGenerationConfig = normalizeGenerationConfig;
exports.submitProductToQueue = submitProductToQueue;
exports.cancelPendingProductTask = cancelPendingProductTask;
const drizzle_orm_1 = require("drizzle-orm");
const nanoid_1 = require("nanoid");
const db_1 = require("./db");
const schema_1 = require("./db/schema");
class TaskLifecycleError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = "TaskLifecycleError";
    }
}
exports.TaskLifecycleError = TaskLifecycleError;
function normalizeGenerationConfig(input) {
    if (!input || typeof input !== "object") {
        return null;
    }
    const normalizeArray = (value) => Array.isArray(value)
        ? value.filter((entry) => typeof entry === "string" && entry.trim().length > 0)
        : undefined;
    const config = {
        productConfigPath: typeof input.productConfigPath === "string" &&
            input.productConfigPath.trim().length > 0
            ? input.productConfigPath.trim()
            : undefined,
        selectedImages: normalizeArray(input.selectedImages),
        selectedImageNotes: normalizeArray(input.selectedImageNotes),
        modelImage: typeof input.modelImage === "string" && input.modelImage.trim().length > 0
            ? input.modelImage.trim()
            : undefined,
        customRequirements: normalizeArray(input.customRequirements),
    };
    return Object.values(config).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value))
        ? config
        : null;
}
async function submitProductToQueue(params) {
    const { productId, userId, generationConfig } = params;
    const product = await db_1.db.query.products.findFirst({
        where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.id, productId), (0, drizzle_orm_1.eq)(schema_1.products.userId, userId)),
    });
    if (!product) {
        throw new TaskLifecycleError("Product not found", 404);
    }
    if (product.status !== "draft") {
        throw new TaskLifecycleError("Product already submitted", 400);
    }
    const profile = await db_1.db.query.userProfiles.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.userProfiles.id, userId),
    });
    if (!profile || (profile.creditsBalance || 0) < 1) {
        throw new TaskLifecycleError("Insufficient credits", 400);
    }
    const sourceImages = await db_1.db.query.productSourceImages.findMany({
        where: (0, drizzle_orm_1.eq)(schema_1.productSourceImages.productId, productId),
    });
    if (sourceImages.length === 0) {
        throw new TaskLifecycleError("Please upload at least one product image", 400);
    }
    const now = new Date();
    const aiTaskId = (0, nanoid_1.nanoid)();
    await db_1.db.transaction(async (tx) => {
        await tx
            .update(schema_1.userProfiles)
            .set({
            creditsBalance: (profile.creditsBalance || 0) - 1,
            creditsFrozen: (profile.creditsFrozen || 0) + 1,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.userProfiles.id, userId));
        await tx.insert(schema_1.creditTransactions).values({
            id: (0, nanoid_1.nanoid)(),
            userId,
            type: "submission",
            amount: -1,
            balanceAfter: (profile.creditsBalance || 0) - 1,
            referenceId: productId,
            description: `提交产品: ${product.name}`,
            createdAt: now,
        });
        await tx.insert(schema_1.aiGenerationTasks).values({
            id: aiTaskId,
            productId,
            status: "pending",
            targetCount: 20,
            createdAt: now,
            updatedAt: now,
        });
        await tx.insert(schema_1.taskQueue).values({
            id: (0, nanoid_1.nanoid)(),
            type: "style_analysis",
            status: "pending",
            priority: 10,
            payload: {
                productId,
                aiGenerationTaskId: aiTaskId,
                sourceImageIds: sourceImages.map((img) => img.id),
                sourceImageUrls: sourceImages.map((img) => img.url),
                ...(generationConfig ?? {}),
            },
            referenceId: productId,
            referenceType: "product",
            attemptCount: 0,
            maxAttempts: 3,
            availableAt: now,
            createdAt: now,
        });
        await tx
            .update(schema_1.products)
            .set({
            status: "submitted",
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.products.id, productId));
    });
    return {
        aiGenerationTaskId: aiTaskId,
        productId,
        productStatus: "submitted",
    };
}
async function cancelPendingProductTask(params) {
    const { productId, userId } = params;
    const product = await db_1.db.query.products.findFirst({
        where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.id, productId), (0, drizzle_orm_1.eq)(schema_1.products.userId, userId)),
    });
    if (!product) {
        throw new TaskLifecycleError("Product not found", 404);
    }
    const profile = await db_1.db.query.userProfiles.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.userProfiles.id, userId),
    });
    if (!profile) {
        throw new TaskLifecycleError("User profile not found", 404);
    }
    const queueItems = await db_1.db.query.taskQueue.findMany({
        where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taskQueue.referenceId, productId), (0, drizzle_orm_1.eq)(schema_1.taskQueue.referenceType, "product")),
    });
    const pendingQueueItems = queueItems.filter((task) => task.status === "pending");
    if (pendingQueueItems.length === 0) {
        throw new TaskLifecycleError("No pending task to cancel", 400);
    }
    const aiTasks = await db_1.db.query.aiGenerationTasks.findMany({
        where: (0, drizzle_orm_1.eq)(schema_1.aiGenerationTasks.productId, productId),
    });
    const latestTask = aiTasks
        .slice()
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
    if (!latestTask || !["pending", "queued"].includes(latestTask.status || "")) {
        throw new TaskLifecycleError("No cancellable AI task found", 400);
    }
    const now = new Date();
    await db_1.db.transaction(async (tx) => {
        await tx
            .update(schema_1.taskQueue)
            .set({
            status: "cancelled",
            completedAt: now,
            lockedAt: null,
            lockedBy: null,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taskQueue.referenceId, productId), (0, drizzle_orm_1.eq)(schema_1.taskQueue.referenceType, "product"), (0, drizzle_orm_1.eq)(schema_1.taskQueue.status, "pending")));
        await tx
            .update(schema_1.aiGenerationTasks)
            .set({
            status: "cancelled",
            errorMessage: "Cancelled by user",
            completedAt: now,
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.aiGenerationTasks.id, latestTask.id));
        await tx
            .update(schema_1.userProfiles)
            .set({
            creditsFrozen: Math.max((profile.creditsFrozen || 0) - 1, 0),
            creditsBalance: (profile.creditsBalance || 0) + 1,
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.userProfiles.id, userId));
        await tx.insert(schema_1.creditTransactions).values({
            id: (0, nanoid_1.nanoid)(),
            userId,
            type: "refund",
            amount: 1,
            balanceAfter: (profile.creditsBalance || 0) + 1,
            referenceId: productId,
            description: `取消任务退款: ${product.name}`,
            createdAt: now,
        });
        await tx
            .update(schema_1.products)
            .set({
            status: "cancelled",
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.products.id, productId));
    });
    return {
        aiGenerationTaskId: latestTask.id,
        cancelledTaskCount: pendingQueueItems.length,
        productId,
        productStatus: "cancelled",
    };
}
