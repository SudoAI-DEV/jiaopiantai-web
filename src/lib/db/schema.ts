import { sqliteTable, text, integer, real, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// 用户表 - Better Auth 兼容
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 会话表
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
});

// 账户表
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 验证表
export const verifications = sqliteTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// 扩展用户表 - 应用特定字段
export const userProfiles = sqliteTable('user_profiles', {
  id: text('id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['customer', 'admin'] }).default('customer').notNull(),
  shopName: text('shop_name'),
  phone: text('phone'),
  category: text('category'),
  creditsBalance: integer('credits_balance').default(0).notNull(),
  creditsFrozen: integer('credits_frozen').default(0).notNull(),
  creditsTotalSpent: integer('credits_total_spent').default(0).notNull(),
});

// 角色枚举
export const roleEnum = ['customer', 'admin'] as const;
export type Role = typeof roleEnum[number];

// 产品状态枚举
export const productStatusEnum = ['draft', 'submitted', 'queued', 'processing', 'reviewing', 'client_reviewing', 'feedback_received', 'reworking', 'completed', 'failed', 'cancelled'] as const;
export type ProductStatus = typeof productStatusEnum[number];

// 图片审核状态枚举
export const imageReviewStatusEnum = ['pending', 'approved', 'rejected', 'regenerate'] as const;
export type ImageReviewStatus = typeof imageReviewStatusEnum[number];

// 交易类型枚举
export const transactionTypeEnum = ['recharge', 'purchase', 'submission', 'completion', 'refund'] as const;
export type TransactionType = typeof transactionTypeEnum[number];

// AI 任务状态枚举
export const aiTaskStatusEnum = ['pending', 'queued', 'processing', 'completed', 'failed', 'cancelled'] as const;
export type AITaskStatus = typeof aiTaskStatusEnum[number];

// 反馈类型枚举
export const feedbackTypeEnum = ['perfect', 'minor_issues', 'major_issues', 'other'] as const;
export type FeedbackType = typeof feedbackTypeEnum[number];

// 点数交易记录表
export const creditTransactions = sqliteTable('credit_transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type', { enum: transactionTypeEnum }).notNull(),
  amount: integer('amount').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  productId: text('product_id'),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userIdIdx: index('ct_user_id_idx').on(table.userId),
}));

// 产品表
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  productNumber: text('product_number').notNull().unique(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  shootingRequirements: text('shooting_requirements').notNull(),
  stylePreference: text('style_preference').notNull(),
  specialNotes: text('special_notes'),
  deliveryCount: integer('delivery_count').default(6).notNull(),
  status: text('status', { enum: productStatusEnum }).default('draft').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userIdIdx: index('product_user_id_idx').on(table.userId),
  productNumberIdx: index('product_number_idx').on(table.productNumber),
}));

// 产品原始图片表
export const productSourceImages = sqliteTable('product_source_images', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  url: text('url').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  productIdIdx: index('source_image_product_idx').on(table.productId),
}));

// AI 生成图片表
export const productGeneratedImages = sqliteTable('product_generated_images', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  batchNumber: integer('batch_number').default(1).notNull(),
  reviewStatus: text('review_status', { enum: imageReviewStatusEnum }).default('pending').notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  reviewedBy: text('reviewed_by'),
}, (table) => ({
  productIdIdx: index('generated_image_product_idx').on(table.productId),
}));

// 图片反馈表
export const imageFeedbacks = sqliteTable('image_feedbacks', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  userId: text('user_id').notNull(),
  type: text('type', { enum: feedbackTypeEnum }).notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 风格模板表
export const styleTemplates = sqliteTable('style_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 产品风格选择表
export const productStyleSelections = sqliteTable('product_style_selections', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  styleId: text('style_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 交付批次表
export const deliveryBatches = sqliteTable('delivery_batches', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  batchNumber: integer('batch_number').notNull(),
  imageCount: integer('image_count').notNull(),
  deliveredAt: integer('delivered_at', { mode: 'timestamp' }).notNull(),
  deliveredBy: text('delivered_by'),
});

// 交付图片明细表
export const deliveryImages = sqliteTable('delivery_images', {
  id: text('id').primaryKey(),
  deliveryBatchId: text('delivery_batch_id').notNull(),
  imageId: text('image_id').notNull(),
  sortOrder: integer('sort_order').default(0),
});

// AI 生成任务表
export const aiGenerationTasks = sqliteTable('ai_generation_tasks', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  batchNumber: integer('batch_number').default(1).notNull(),
  status: text('status', { enum: aiTaskStatusEnum }).default('pending').notNull(),
  targetCount: integer('target_count').default(20).notNull(),
  resultCount: integer('result_count'),
  errorMessage: text('error_message'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 操作审计日志表
export const operationLogs = sqliteTable('operation_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 用户关系
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.id],
  }),
  products: many(products),
  creditTransactions: many(creditTransactions),
}));

// 用户配置关系
export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.id],
    references: [users.id],
  }),
}));

// 产品关系
export const productsRelations = relations(products, ({ one, many }) => ({
  user: one(users, {
    fields: [products.userId],
    references: [users.id],
  }),
  sourceImages: many(productSourceImages),
  generatedImages: many(productGeneratedImages),
}));

// 原始图片关系
export const productSourceImagesRelations = relations(productSourceImages, ({ one }) => ({
  product: one(products, {
    fields: [productSourceImages.productId],
    references: [products.id],
  }),
}));

// 生成图片关系
export const productGeneratedImagesRelations = relations(productGeneratedImages, ({ one }) => ({
  product: one(products, {
    fields: [productGeneratedImages.productId],
    references: [products.id],
  }),
}));

// 反馈关系
export const imageFeedbacksRelations = relations(imageFeedbacks, ({ one }) => ({
  product: one(products, {
    fields: [imageFeedbacks.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [imageFeedbacks.userId],
    references: [users.id],
  }),
}));

// 风格选择关系
export const productStyleSelectionsRelations = relations(productStyleSelections, ({ one }) => ({
  product: one(products, {
    fields: [productStyleSelections.productId],
    references: [products.id],
  }),
  style: one(styleTemplates, {
    fields: [productStyleSelections.styleId],
    references: [styleTemplates.id],
  }),
}));

// 交付批次关系
export const deliveryBatchesRelations = relations(deliveryBatches, ({ one, many }) => ({
  product: one(products, {
    fields: [deliveryBatches.productId],
    references: [products.id],
  }),
  deliveredByUser: one(users, {
    fields: [deliveryBatches.deliveredBy],
    references: [users.id],
  }),
  images: many(deliveryImages),
}));

// 交付图片关系
export const deliveryImagesRelations = relations(deliveryImages, ({ one }) => ({
  batch: one(deliveryBatches, {
    fields: [deliveryImages.deliveryBatchId],
    references: [deliveryBatches.id],
  }),
  image: one(productGeneratedImages, {
    fields: [deliveryImages.imageId],
    references: [productGeneratedImages.id],
  }),
}));

// 任务关系
export const aiGenerationTasksRelations = relations(aiGenerationTasks, ({ one }) => ({
  product: one(products, {
    fields: [aiGenerationTasks.productId],
    references: [products.id],
  }),
}));

// 审计日志关系
export const operationLogsRelations = relations(operationLogs, ({ one }) => ({
  user: one(users, {
    fields: [operationLogs.userId],
    references: [users.id],
  }),
}));

// 导出类型
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductSourceImage = typeof productSourceImages.$inferSelect;
export type ProductGeneratedImage = typeof productGeneratedImages.$inferSelect;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type StyleTemplate = typeof styleTemplates.$inferSelect;
export type DeliveryBatch = typeof deliveryBatches.$inferSelect;
export type AIGenerationTask = typeof aiGenerationTasks.$inferSelect;
export type NewAIGenerationTask = typeof aiGenerationTasks.$inferInsert;
