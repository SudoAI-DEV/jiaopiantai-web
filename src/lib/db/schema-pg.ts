import { pgTable, text, integer, boolean, timestamp, varchar, jsonb, primaryKey, index } from 'drizzle-orm/pg-core';

// Users table - Better Auth compatible
export const users = pgTable('users', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  emailVerified: boolean('email_verified').default(false),
  phone: varchar('phone', { length: 20 }).unique(),
  phoneVerified: boolean('phone_verified').default(false),
  image: varchar('image', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

// Sessions table
export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 50 }).primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  userId: varchar('user_id', { length: 50 }).notNull(),
});

// Accounts table
export const accounts = pgTable('accounts', {
  id: varchar('id', { length: 50 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

// Verifications table
export const verifications = pgTable('verifications', {
  id: varchar('id', { length: 50 }).primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }),
});

// User profiles table
export const userProfiles = pgTable('user_profiles', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull().unique(),
  role: varchar('role', { length: 20 }).default('customer'),
  shopName: varchar('shop_name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  creditsBalance: integer('credits_balance').default(0),
  creditsFrozen: integer('credits_frozen').default(0),
  creditsTotalSpent: integer('credits_total_spent').default(0),
  category: varchar('category', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

// Credit transactions table
export const creditTransactions = pgTable('credit_transactions', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  amount: integer('amount').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  description: text('description'),
  referenceId: varchar('reference_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;

// Customer private models
export const customerModels = pgTable('customer_models', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url').notNull(),
  fileName: varchar('file_name', { length: 255 }),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  userActiveCreatedIdx: index('customer_models_user_active_created_idx').on(
    table.userId,
    table.isActive,
    table.createdAt
  ),
}));

export type CustomerModel = typeof customerModels.$inferSelect;
export type NewCustomerModel = typeof customerModels.$inferInsert;

// Products table
export const products = pgTable('products', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  productNumber: varchar('product_number', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 30 }).default('draft'),
  deliveryCount: integer('delivery_count').default(6),
  shootingRequirements: text('shooting_requirements'),
  stylePreference: text('style_preference'),
  specialNotes: text('special_notes'),
  modelId: varchar('model_id', { length: 50 }),
  selectedStyleId: varchar('selected_style_id', { length: 50 }),
  batchNumber: integer('batch_number'),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: varchar("reviewed_by", { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  modelIdx: index('products_model_id_idx').on(table.modelId),
}));

export type Product = typeof products.$inferSelect;
export type ProductStatus = Product['status'];

// Product source images
export const productSourceImages = pgTable('product_source_images', {
  id: varchar('id', { length: 50 }).primaryKey(),
  productId: varchar('product_id', { length: 50 }).notNull(),
  url: text('url').notNull(),
  fileName: varchar('file_name', { length: 255 }),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  sortOrder: integer("sort_order").default(0),
  batchNumber: integer("batch_number"),
  analysis: jsonb('analysis'),
  analyzedAt: timestamp('analyzed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export type ProductSourceImage = typeof productSourceImages.$inferSelect;

// Product generated images
export const productGeneratedImages = pgTable('product_generated_images', {
  id: varchar('id', { length: 50 }).primaryKey(),
  productId: varchar('product_id', { length: 50 }).notNull(),
  generationTaskId: varchar('generation_task_id', { length: 50 }),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  fileName: varchar('file_name', { length: 255 }),
  fileSize: integer('file_size'),
  sortOrder: integer("sort_order").default(0),
  batchNumber: integer("batch_number"),
  reviewStatus: varchar('review_status', { length: 20 }).default('pending'),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: varchar("reviewed_by", { length: 50 }),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export type ProductGeneratedImage = typeof productGeneratedImages.$inferSelect;

// Image feedback
export const imageFeedbacks = pgTable('image_feedbacks', {
  id: varchar('id', { length: 50 }).primaryKey(),
  productId: varchar('product_id', { length: 50 }).notNull(),
  imageId: varchar('image_id', { length: 50 }),
  feedbackType: varchar('feedback_type', { length: 30 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

// Style templates — DEPRECATED: scenes are now code-driven (src/lib/scenes.ts)
// Table definition kept for migration compatibility; no code should query this table.
export const styleTemplates = pgTable('style_templates', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  isActive: boolean('is_active').default(true),
  sortOrder: integer("sort_order").default(0),
  batchNumber: integer("batch_number"),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export type StyleTemplate = typeof styleTemplates.$inferSelect;

// Product style selections
export const productStyleSelections = pgTable('product_style_selections', {
  id: varchar('id', { length: 50 }).primaryKey(),
  productId: varchar('product_id', { length: 50 }).notNull(),
  styleId: varchar('style_id', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

// Delivery batches
export const deliveryBatches = pgTable('delivery_batches', {
  id: varchar('id', { length: 50 }).primaryKey(),
  productId: varchar('product_id', { length: 50 }).notNull(),
  batchNumber: integer('batch_number'),
  imageCount: integer('image_count'),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  deliveredCount: integer('delivered_count').default(0),
  deliveredBy: varchar('delivered_by', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

// Delivery images
export const deliveryImages = pgTable('delivery_images', {
  id: varchar('id', { length: 50 }).primaryKey(),
  batchId: varchar('batch_id', { length: 50 }).notNull(),
  imageId: varchar('image_id', { length: 50 }).notNull(),
  sortOrder: integer('sort_order'),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }).notNull(),
});

// AI generation tasks
export const aiGenerationTasks = pgTable('ai_generation_tasks', {
  id: varchar('id', { length: 50 }).primaryKey(),
  productId: varchar('product_id', { length: 50 }).notNull(),
  styleId: varchar('style_id', { length: 50 }),
  status: varchar('status', { length: 30 }).default('pending'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  targetCount: integer('target_count').default(6),
  completedCount: integer('completed_count').default(0),
  resultCount: integer('result_count'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  taskId: varchar('task_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export type AIGenerationTask = typeof aiGenerationTasks.$inferSelect;

// Operation logs
export const operationLogs = pgTable('operation_logs', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: varchar('entity_id', { length: 100 }),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

// Task queue - generic task queue for worker processing
export const taskQueue = pgTable('task_queue', {
  id: varchar('id', { length: 50 }).primaryKey(),
  type: varchar('type', { length: 50 }).notNull(), // style_analysis, image_generation, etc.
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, processing, completed, failed, cancelled
  priority: integer('priority').default(10).notNull(),
  payload: jsonb('payload'), // task-specific input data
  result: jsonb('result'), // task execution result
  referenceId: varchar('reference_id', { length: 50 }), // associated business ID
  referenceType: varchar('reference_type', { length: 50 }), // product, ai_generation_task, etc.
  attemptCount: integer('attempt_count').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  errorMessage: text('error_message'),
  failureType: varchar('failure_type', { length: 20 }), // retryable, permanent
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lockedBy: varchar('locked_by', { length: 100 }),
  availableAt: timestamp('available_at', { withTimezone: true }).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => ({
  claimIdx: index('task_queue_claim_idx').on(
    table.type,
    table.status,
    table.availableAt,
    table.priority,
    table.createdAt
  ),
  referenceIdx: index('task_queue_reference_idx').on(
    table.referenceId,
    table.referenceType
  ),
  recoveryIdx: index('task_queue_recovery_idx').on(
    table.status,
    table.lockedAt
  ),
}));

export type TaskQueueItem = typeof taskQueue.$inferSelect;
export type NewTaskQueueItem = typeof taskQueue.$inferInsert;
