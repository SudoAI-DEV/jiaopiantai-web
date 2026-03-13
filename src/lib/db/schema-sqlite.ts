import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table - Better Auth compatible
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Sessions table
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

// Accounts table
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

// Verifications table
export const verifications = sqliteTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

// User profiles table
export const userProfiles = sqliteTable('user_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').default('customer'),
  shopName: text('shop_name'),
  phone: text('phone'),
  creditsBalance: integer('credits_balance').default(0),
  creditsFrozen: integer('credits_frozen').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

// Credit transactions table
export const creditTransactions = sqliteTable('credit_transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  amount: integer('amount').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  description: text('description'),
  referenceId: text('reference_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;

// Products table
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productNumber: text('product_number').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  status: text('status').default('draft'),
  deliveryCount: integer('delivery_count').default(6),
  shootingRequirements: text('shooting_requirements'),
  stylePreference: text('style_preference'),
  specialNotes: text('special_notes'),
  selectedStyleId: text('selected_style_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type Product = typeof products.$inferSelect;
export type ProductStatus = Product['status'];

// Product source images
export const productSourceImages = sqliteTable('product_source_images', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type ProductSourceImage = typeof productSourceImages.$inferSelect;

// Product generated images
export const productGeneratedImages = sqliteTable('product_generated_images', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  sortOrder: integer('sort_order').default(0),
  reviewStatus: text('review_status').default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type ProductGeneratedImage = typeof productGeneratedImages.$inferSelect;

// Image feedback
export const imageFeedbacks = sqliteTable('image_feedbacks', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  imageId: text('image_id').references(() => productGeneratedImages.id, { onDelete: 'cascade' }),
  feedbackType: text('feedback_type').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Style templates
export const styleTemplates = sqliteTable('style_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  isActive: integer('is_active').default(1),
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type StyleTemplate = typeof styleTemplates.$inferSelect;

// Product style selections
export const productStyleSelections = sqliteTable('product_style_selections', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  styleId: text('style_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Delivery batches
export const deliveryBatches = sqliteTable('delivery_batches', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
  deliveredCount: integer('delivered_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Delivery images
export const deliveryImages = sqliteTable('delivery_images', {
  id: text('id').primaryKey(),
  batchId: text('batch_id').notNull().references(() => deliveryBatches.id, { onDelete: 'cascade' }),
  imageId: text('image_id').notNull().references(() => productGeneratedImages.id, { onDelete: 'cascade' }),
  deliveredAt: integer('delivered_at', { mode: 'timestamp' }).notNull(),
});

// AI generation tasks
export const aiGenerationTasks = sqliteTable('ai_generation_tasks', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  styleId: text('style_id'),
  status: text('status').default('pending'),
  targetCount: integer('target_count').default(6),
  completedCount: integer('completed_count').default(0),
  taskId: text('task_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type AIGenerationTask = typeof aiGenerationTasks.$inferSelect;

// Operation logs
export const operationLogs = sqliteTable('operation_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
