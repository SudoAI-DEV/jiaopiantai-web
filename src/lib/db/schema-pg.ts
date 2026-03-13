import { pgTable, text, integer, boolean, timestamp, serial, varchar, jsonb, primaryKey, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table - Better Auth compatible
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  image: varchar('image', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
}));

// Sessions table
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'timestamp' }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => ({
  tokenIdx: index('sessions_token_idx').on(table.token),
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
}));

// Accounts table
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true, mode: 'timestamp' }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true, mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
});

// Verifications table
export const verifications = pgTable('verifications', {
  id: serial('id').primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'timestamp' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'timestamp' }),
});

// User profiles table
export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).default('customer'),
  shopName: varchar('shop_name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  creditsBalance: integer('credits_balance').default(0),
  creditsFrozen: integer('credits_frozen').default(0),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
}, (table) => ({
  userIdIdx: index('user_profiles_user_id_idx').on(table.userId),
}));

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

// Credit transactions table
export const creditTransactions = pgTable('credit_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(),
  amount: integer('amount').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  description: text('description'),
  referenceId: varchar('reference_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
}, (table) => ({
  userIdIdx: index('credit_transactions_user_id_idx').on(table.userId),
  createdAtIdx: index('credit_transactions_created_at_idx').on(table.createdAt),
}));

export type CreditTransaction = typeof creditTransactions.$inferSelect;

// Products table
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productNumber: varchar('product_number', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 30 }).default('draft'),
  deliveryCount: integer('delivery_count').default(6),
  shootingRequirements: text('shooting_requirements'),
  stylePreference: text('style_preference'),
  specialNotes: text('special_notes'),
  selectedStyleId: varchar('selected_style_id', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
}, (table) => ({
  userIdIdx: index('products_user_id_idx').on(table.userId),
  statusIdx: index('products_status_idx').on(table.status),
  createdAtIdx: index('products_created_at_idx').on(table.createdAt),
}));

export type Product = typeof products.$inferSelect;
export type ProductStatus = Product['status'];

// Product source images
export const productSourceImages = pgTable('product_source_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
}, (table) => ({
  productIdIdx: index('product_source_images_product_id_idx').on(table.productId),
}));

export type ProductSourceImage = typeof productSourceImages.$inferSelect;

// Product generated images
export const productGeneratedImages = pgTable('product_generated_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  sortOrder: integer('sort_order').default(0),
  reviewStatus: varchar('review_status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
}, (table) => ({
  productIdIdx: index('product_generated_images_product_id_idx').on(table.productId),
  reviewStatusIdx: index('product_generated_images_review_status_idx').on(table.reviewStatus),
}));

export type ProductGeneratedImage = typeof productGeneratedImages.$inferSelect;

// Image feedback
export const imageFeedbacks = pgTable('image_feedbacks', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  imageId: integer('image_id').references(() => productGeneratedImages.id, { onDelete: 'cascade' }),
  feedbackType: varchar('feedback_type', { length: 30 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
});

// Style templates
export const styleTemplates = pgTable('style_templates', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
}, (table) => ({
  sortOrderIdx: index('style_templates_sort_order_idx').on(table.sortOrder),
}));

export type StyleTemplate = typeof styleTemplates.$inferSelect;

// Product style selections
export const productStyleSelections = pgTable('product_style_selections', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  styleId: varchar('style_id', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
});

// Delivery batches
export const deliveryBatches = pgTable('delivery_batches', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'timestamp' }),
  deliveredCount: integer('delivered_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
});

// Delivery images
export const deliveryImages = pgTable('delivery_images', {
  id: serial('id').primaryKey(),
  batchId: integer('batch_id').notNull().references(() => deliveryBatches.id, { onDelete: 'cascade' }),
  imageId: integer('image_id').notNull().references(() => productGeneratedImages.id, { onDelete: 'cascade' }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
});

// AI generation tasks
export const aiGenerationTasks = pgTable('ai_generation_tasks', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  styleId: varchar('style_id', { length: 50 }),
  status: varchar('status', { length: 30 }).default('pending'),
  targetCount: integer('target_count').default(6),
  completedCount: integer('completed_count').default(0),
  taskId: varchar('task_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
}, (table) => ({
  productIdIdx: index('ai_generation_tasks_product_id_idx').on(table.productId),
  statusIdx: index('ai_generation_tasks_status_idx').on(table.status),
}));

export type AIGenerationTask = typeof aiGenerationTasks.$inferSelect;

// Operation logs
export const operationLogs = pgTable('operation_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: varchar('entity_id', { length: 100 }),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`),
}, (table) => ({
  userIdIdx: index('operation_logs_user_id_idx').on(table.userId),
  actionIdx: index('operation_logs_action_idx').on(table.action),
  createdAtIdx: index('operation_logs_created_at_idx').on(table.createdAt),
}));
