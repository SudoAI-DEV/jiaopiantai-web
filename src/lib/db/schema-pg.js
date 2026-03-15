"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskQueue = exports.operationLogs = exports.aiGenerationTasks = exports.deliveryImages = exports.deliveryBatches = exports.productStyleSelections = exports.styleTemplates = exports.imageFeedbacks = exports.productGeneratedImages = exports.productSourceImages = exports.products = exports.creditTransactions = exports.userProfiles = exports.verifications = exports.accounts = exports.sessions = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// Users table - Better Auth compatible
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).unique(),
    emailVerified: (0, pg_core_1.boolean)('email_verified').default(false),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }).unique(),
    phoneVerified: (0, pg_core_1.boolean)('phone_verified').default(false),
    image: (0, pg_core_1.varchar)('image', { length: 500 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull(),
});
// Sessions table
exports.sessions = (0, pg_core_1.pgTable)('sessions', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    token: (0, pg_core_1.varchar)('token', { length: 255 }).notNull().unique(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull(),
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 50 }),
    userAgent: (0, pg_core_1.text)('user_agent'),
    userId: (0, pg_core_1.varchar)('user_id', { length: 50 }).notNull(),
});
// Accounts table
exports.accounts = (0, pg_core_1.pgTable)('accounts', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    accountId: (0, pg_core_1.varchar)('account_id', { length: 255 }).notNull(),
    providerId: (0, pg_core_1.varchar)('provider_id', { length: 255 }).notNull(),
    userId: (0, pg_core_1.varchar)('user_id', { length: 50 }).notNull(),
    accessToken: (0, pg_core_1.text)('access_token'),
    refreshToken: (0, pg_core_1.text)('refresh_token'),
    idToken: (0, pg_core_1.text)('id_token'),
    accessTokenExpiresAt: (0, pg_core_1.timestamp)('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: (0, pg_core_1.timestamp)('refresh_token_expires_at', { withTimezone: true }),
    scope: (0, pg_core_1.text)('scope'),
    password: (0, pg_core_1.text)('password'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull(),
});
// Verifications table
exports.verifications = (0, pg_core_1.pgTable)('verifications', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    identifier: (0, pg_core_1.varchar)('identifier', { length: 255 }).notNull(),
    value: (0, pg_core_1.text)('value').notNull(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }),
});
// User profiles table
exports.userProfiles = (0, pg_core_1.pgTable)('user_profiles', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    userId: (0, pg_core_1.varchar)('user_id', { length: 50 }).notNull().unique(),
    role: (0, pg_core_1.varchar)('role', { length: 20 }).default('customer'),
    shopName: (0, pg_core_1.varchar)('shop_name', { length: 255 }),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }),
    creditsBalance: (0, pg_core_1.integer)('credits_balance').default(0),
    creditsFrozen: (0, pg_core_1.integer)('credits_frozen').default(0),
    creditsTotalSpent: (0, pg_core_1.integer)('credits_total_spent').default(0),
    category: (0, pg_core_1.varchar)('category', { length: 50 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull(),
});
// Credit transactions table
exports.creditTransactions = (0, pg_core_1.pgTable)('credit_transactions', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    userId: (0, pg_core_1.varchar)('user_id', { length: 50 }).notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 20 }).notNull(),
    amount: (0, pg_core_1.integer)('amount').notNull(),
    balanceAfter: (0, pg_core_1.integer)('balance_after').notNull(),
    description: (0, pg_core_1.text)('description'),
    referenceId: (0, pg_core_1.varchar)('reference_id', { length: 100 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
});
// Products table
exports.products = (0, pg_core_1.pgTable)('products', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    userId: (0, pg_core_1.varchar)('user_id', { length: 50 }).notNull(),
    productNumber: (0, pg_core_1.varchar)('product_number', { length: 50 }).notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    category: (0, pg_core_1.varchar)('category', { length: 50 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('draft'),
    deliveryCount: (0, pg_core_1.integer)('delivery_count').default(6),
    shootingRequirements: (0, pg_core_1.text)('shooting_requirements'),
    stylePreference: (0, pg_core_1.text)('style_preference'),
    specialNotes: (0, pg_core_1.text)('special_notes'),
    selectedStyleId: (0, pg_core_1.varchar)('selected_style_id', { length: 50 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull(),
});
// Product source images
exports.productSourceImages = (0, pg_core_1.pgTable)('product_source_images', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    productId: (0, pg_core_1.varchar)('product_id', { length: 50 }).notNull(),
    url: (0, pg_core_1.text)('url').notNull(),
    fileName: (0, pg_core_1.varchar)('file_name', { length: 255 }),
    fileSize: (0, pg_core_1.integer)('file_size'),
    mimeType: (0, pg_core_1.varchar)('mime_type', { length: 100 }),
    sortOrder: (0, pg_core_1.integer)("sort_order").default(0),
    batchNumber: (0, pg_core_1.integer)("batch_number"),
    analysis: (0, pg_core_1.jsonb)('analysis'),
    analyzedAt: (0, pg_core_1.timestamp)('analyzed_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
});
// Product generated images
exports.productGeneratedImages = (0, pg_core_1.pgTable)('product_generated_images', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    productId: (0, pg_core_1.varchar)('product_id', { length: 50 }).notNull(),
    generationTaskId: (0, pg_core_1.varchar)('generation_task_id', { length: 50 }),
    url: (0, pg_core_1.text)('url').notNull(),
    thumbnailUrl: (0, pg_core_1.text)('thumbnail_url'),
    fileName: (0, pg_core_1.varchar)('file_name', { length: 255 }),
    fileSize: (0, pg_core_1.integer)('file_size'),
    sortOrder: (0, pg_core_1.integer)("sort_order").default(0),
    batchNumber: (0, pg_core_1.integer)("batch_number"),
    reviewStatus: (0, pg_core_1.varchar)('review_status', { length: 20 }).default('pending'),
    reviewedAt: (0, pg_core_1.timestamp)("reviewed_at", { withTimezone: true }),
    reviewedBy: (0, pg_core_1.varchar)("reviewed_by", { length: 50 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
});
// Image feedback
exports.imageFeedbacks = (0, pg_core_1.pgTable)('image_feedbacks', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    productId: (0, pg_core_1.varchar)('product_id', { length: 50 }).notNull(),
    imageId: (0, pg_core_1.varchar)('image_id', { length: 50 }),
    feedbackType: (0, pg_core_1.varchar)('feedback_type', { length: 30 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
});
// Style templates
exports.styleTemplates = (0, pg_core_1.pgTable)('style_templates', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    thumbnailUrl: (0, pg_core_1.text)('thumbnail_url'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    sortOrder: (0, pg_core_1.integer)("sort_order").default(0),
    batchNumber: (0, pg_core_1.integer)("batch_number"),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
});
// Product style selections
exports.productStyleSelections = (0, pg_core_1.pgTable)('product_style_selections', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    productId: (0, pg_core_1.varchar)('product_id', { length: 50 }).notNull(),
    styleId: (0, pg_core_1.varchar)('style_id', { length: 50 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
});
// Delivery batches
exports.deliveryBatches = (0, pg_core_1.pgTable)('delivery_batches', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    productId: (0, pg_core_1.varchar)('product_id', { length: 50 }).notNull(),
    batchNumber: (0, pg_core_1.integer)('batch_number'),
    imageCount: (0, pg_core_1.integer)('image_count'),
    deliveredAt: (0, pg_core_1.timestamp)('delivered_at', { withTimezone: true }),
    deliveredCount: (0, pg_core_1.integer)('delivered_count').default(0),
    deliveredBy: (0, pg_core_1.varchar)('delivered_by', { length: 50 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
});
// Delivery images
exports.deliveryImages = (0, pg_core_1.pgTable)('delivery_images', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    batchId: (0, pg_core_1.varchar)('batch_id', { length: 50 }).notNull(),
    imageId: (0, pg_core_1.varchar)('image_id', { length: 50 }).notNull(),
    sortOrder: (0, pg_core_1.integer)('sort_order'),
    deliveredAt: (0, pg_core_1.timestamp)('delivered_at', { withTimezone: true }).notNull(),
});
// AI generation tasks
exports.aiGenerationTasks = (0, pg_core_1.pgTable)('ai_generation_tasks', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    productId: (0, pg_core_1.varchar)('product_id', { length: 50 }).notNull(),
    styleId: (0, pg_core_1.varchar)('style_id', { length: 50 }),
    status: (0, pg_core_1.varchar)('status', { length: 30 }).default('pending'),
    startedAt: (0, pg_core_1.timestamp)('started_at', { withTimezone: true }),
    targetCount: (0, pg_core_1.integer)('target_count').default(6),
    completedCount: (0, pg_core_1.integer)('completed_count').default(0),
    resultCount: (0, pg_core_1.integer)('result_count'),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
    errorMessage: (0, pg_core_1.text)('error_message'),
    taskId: (0, pg_core_1.varchar)('task_id', { length: 100 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull(),
});
// Operation logs
exports.operationLogs = (0, pg_core_1.pgTable)('operation_logs', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    userId: (0, pg_core_1.varchar)('user_id', { length: 50 }),
    action: (0, pg_core_1.varchar)('action', { length: 100 }).notNull(),
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 50 }),
    entityId: (0, pg_core_1.varchar)('entity_id', { length: 100 }),
    details: (0, pg_core_1.jsonb)('details'),
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 50 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
});
// Task queue - generic task queue for worker processing
exports.taskQueue = (0, pg_core_1.pgTable)('task_queue', {
    id: (0, pg_core_1.varchar)('id', { length: 50 }).primaryKey(),
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(), // style_analysis, image_generation, etc.
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('pending').notNull(), // pending, processing, completed, failed, cancelled
    priority: (0, pg_core_1.integer)('priority').default(10).notNull(),
    payload: (0, pg_core_1.jsonb)('payload'), // task-specific input data
    result: (0, pg_core_1.jsonb)('result'), // task execution result
    referenceId: (0, pg_core_1.varchar)('reference_id', { length: 50 }), // associated business ID
    referenceType: (0, pg_core_1.varchar)('reference_type', { length: 50 }), // product, ai_generation_task, etc.
    attemptCount: (0, pg_core_1.integer)('attempt_count').default(0).notNull(),
    maxAttempts: (0, pg_core_1.integer)('max_attempts').default(3).notNull(),
    errorMessage: (0, pg_core_1.text)('error_message'),
    failureType: (0, pg_core_1.varchar)('failure_type', { length: 20 }), // retryable, permanent
    lockedAt: (0, pg_core_1.timestamp)('locked_at', { withTimezone: true }),
    lockedBy: (0, pg_core_1.varchar)('locked_by', { length: 100 }),
    availableAt: (0, pg_core_1.timestamp)('available_at', { withTimezone: true }).notNull(),
    startedAt: (0, pg_core_1.timestamp)('started_at', { withTimezone: true }),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
}, (table) => ({
    claimIdx: (0, pg_core_1.index)('task_queue_claim_idx').on(table.type, table.status, table.availableAt, table.priority, table.createdAt),
    referenceIdx: (0, pg_core_1.index)('task_queue_reference_idx').on(table.referenceId, table.referenceType),
    recoveryIdx: (0, pg_core_1.index)('task_queue_recovery_idx').on(table.status, table.lockedAt),
}));
