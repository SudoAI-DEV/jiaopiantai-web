import { 
  sqliteTable, 
  pgTable,
  text, 
  integer, 
  real, 
  primaryKey, 
  index,
  boolean,
  timestamp,
  serial,
  varchar,
  jsonb
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// Determine if we're using PostgreSQL
const isPg = process.env.DATABASE_URL?.startsWith('postgresql');

// Helper for text column
const textCol = (name: string) => isPg ? varchar(name, { length: 255 }) : text(name);

// Helper for id
const idCol = (name: string) => isPg ? serial(name).primaryKey() : text(name).primaryKey();

// Helper for timestamp
const timestampCol = (name: string) => isPg 
  ? timestamp(name, { withTimezone: true, mode: 'timestamp' }).notNull()
  : integer(name, { mode: 'timestamp' }).notNull();

// Helper for createdAt/updatedAt
const createdAt = () => isPg 
  ? timestamp('created_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`)
  : integer('created_at', { mode: 'timestamp' }).notNull();

const updatedAt = () => isPg 
  ? timestamp('updated_at', { withTimezone: true, mode: 'timestamp' }).notNull().default(sql`now()`)
  : integer('updated_at', { mode: 'timestamp' }).notNull();

// Users table - Better Auth compatible
export const users = isPg 
  ? pgTable('users', {
      id: serial('id').primaryKey(),
      name: varchar('name', { length: 255 }).notNull(),
      email: varchar('email', { length: 255 }).notNull().unique(),
      emailVerified: boolean('email_verified').default(false),
      image: varchar('image', { length: 500 }),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
    })
  : sqliteTable('users', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      email: text('email').notNull().unique(),
      emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
      image: text('image'),
      createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
      updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    });

// Sessions table
export const sessions = isPg
  ? pgTable('sessions', {
      id: serial('id').primaryKey(),
      expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
      token: varchar('token', { length: 255 }).notNull().unique(),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
      ipAddress: varchar('ip_address', { length: 50 }),
      userAgent: text('user_agent'),
      userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    })
  : sqliteTable('sessions', {
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
export const accounts = isPg
  ? pgTable('accounts', {
      id: serial('id').primaryKey(),
      accountId: varchar('account_id', { length: 255 }).notNull(),
      providerId: varchar('provider_id', { length: 255 }).notNull(),
      userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
      accessToken: text('access_token'),
      refreshToken: text('refresh_token'),
      idToken: text('id_token'),
      accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
      refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
      scope: text('scope'),
      password: text('password'),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
    })
  : sqliteTable('accounts', {
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
export const verifications = isPg
  ? pgTable('verifications', {
      id: serial('id').primaryKey(),
      identifier: varchar('identifier', { length: 255 }).notNull(),
      value: text('value').notNull(),
      expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
      createdAt: timestamp('created_at', { withTimezone: true }),
    })
  : sqliteTable('verifications', {
      id: text('id').primaryKey(),
      identifier: text('identifier').notNull(),
      value: text('value').notNull(),
      expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
      createdAt: integer('created_at', { mode: 'timestamp' }),
    });

// User profiles table
export const userProfiles = isPg
  ? pgTable('user_profiles', {
      id: serial('id').primaryKey(),
      userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
      role: varchar('role', { length: 20 }).default('customer'),
      shopName: varchar('shop_name', { length: 255 }),
      phone: varchar('phone', { length: 20 }),
      creditsBalance: integer('credits_balance').default(0),
      creditsFrozen: integer('credits_frozen').default(0),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
    })
  : sqliteTable('user_profiles', {
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
export const creditTransactions = isPg
  ? pgTable('credit_transactions', {
      id: serial('id').primaryKey(),
      userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
      type: varchar('type', { length: 20 }).notNull(),
      amount: integer('amount').notNull(),
      balanceAfter: integer('balance_after').notNull(),
      description: text('description'),
      referenceId: varchar('reference_id', { length: 100 }),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    })
  : sqliteTable('credit_transactions', {
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
export const products = isPg
  ? pgTable('products', {
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
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
    })
  : sqliteTable('products', {
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
export const productSourceImages = isPg
  ? pgTable('product_source_images', {
      id: serial('id').primaryKey(),
      productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
      url: text('url').notNull(),
      sortOrder: integer('sort_order').default(0),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    })
  : sqliteTable('product_source_images', {
      id: text('id').primaryKey(),
      productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
      url: text('url').notNull(),
      sortOrder: integer('sort_order').default(0),
      createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    });

export type ProductSourceImage = typeof productSourceImages.$inferSelect;

// Product generated images
export const productGeneratedImages = isPg
  ? pgTable('product_generated_images', {
      id: serial('id').primaryKey(),
      productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
      url: text('url').notNull(),
      thumbnailUrl: text('thumbnail_url'),
      sortOrder: integer('sort_order').default(0),
      reviewStatus: varchar('review_status', { length: 20 }).default('pending'),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    })
  : sqliteTable('product_generated_images', {
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
export const imageFeedbacks = isPg
  ? pgTable('image_feedbacks', {
      id: serial('id').primaryKey(),
      productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
      imageId: integer('image_id').references(() => productGeneratedImages.id, { onDelete: 'cascade' }),
      feedbackType: varchar('feedback_type', { length: 30 }).notNull(),
      description: text('description'),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    })
  : sqliteTable('image_feedbacks', {
      id: text('id').primaryKey(),
      productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
      imageId: text('image_id').references(() => productGeneratedImages.id, { onDelete: 'cascade' }),
      feedbackType: text('feedback_type').notNull(),
      description: text('description'),
      createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    });

// Style templates
export const styleTemplates = isPg
  ? pgTable('style_templates', {
      id: varchar('id', { length: 50 }).primaryKey(),
      name: varchar('name', { length: 100 }).notNull(),
      description: text('description'),
      thumbnailUrl: text('thumbnail_url'),
      isActive: boolean('is_active').default(true),
      sortOrder: integer('sort_order').default(0),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    })
  : sqliteTable('style_templates', {
      id: text('id').primaryKey(),
      name: text('name').notNull(),
      description: text('description'),
      thumbnailUrl: text('thumbnail_url'),
      isActive: integer('is_active').default(1),
      sortOrder: integer('sort_order').default(0),
      createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    });

// Product style selections
export const productStyleSelections = isPg
  ? pgTable('product_style_selections', {
      id: serial('id').primaryKey(),
      productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
      styleId: varchar('style_id', { length: 50 }).notNull(),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    })
  : sqliteTable('product_style_selections', {
      id: text('id').primaryKey(),
      productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
      styleId: text('style_id').notNull(),
      createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    });

// Delivery batches
export const deliveryBatches = isPg
  ? pgTable('delivery_batches', {
      id: serial('id').primaryKey(),
      productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
      deliveredAt: timestamp('delivered_at', { withTimezone: true }),
      deliveredCount: integer('delivered_count').default(0),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    })
  : sqliteTable('delivery_batches', {
      id: text('id').primaryKey(),
      productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
      deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
      deliveredCount: integer('delivered_count').default(0),
      createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    });

// Delivery images
export const deliveryImages = isPg
  ? pgTable('delivery_images', {
      id: serial('id').primaryKey(),
      batchId: integer('batch_id').notNull().references(() => deliveryBatches.id, { onDelete: 'cascade' }),
      imageId: integer('image_id').notNull().references(() => productGeneratedImages.id, { onDelete: 'cascade' }),
      deliveredAt: timestamp('delivered_at', { withTimezone: true }).notNull().default(sql`now()`),
    })
  : sqliteTable('delivery_images', {
      id: text('id').primaryKey(),
      batchId: text('batch_id').notNull().references(() => deliveryBatches.id, { onDelete: 'cascade' }),
      imageId: text('image_id').notNull().references(() => productGeneratedImages.id, { onDelete: 'cascade' }),
      deliveredAt: integer('delivered_at', { mode: 'timestamp' }).notNull(),
    });

// AI generation tasks
export const aiGenerationTasks = isPg
  ? pgTable('ai_generation_tasks', {
      id: serial('id').primaryKey(),
      productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
      styleId: varchar('style_id', { length: 50 }),
      status: varchar('status', { length: 30 }).default('pending'),
      targetCount: integer('target_count').default(6),
      completedCount: integer('completed_count').default(0),
      taskId: varchar('task_id', { length: 100 }),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
    })
  : sqliteTable('ai_generation_tasks', {
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
export const operationLogs = isPg
  ? pgTable('operation_logs', {
      id: serial('id').primaryKey(),
      userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
      action: varchar('action', { length: 100 }).notNull(),
      entityType: varchar('entity_type', { length: 50 }),
      entityId: varchar('entity_id', { length: 100 }),
      details: jsonb('details'),
      ipAddress: varchar('ip_address', { length: 50 }),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    })
  : sqliteTable('operation_logs', {
      id: text('id').primaryKey(),
      userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
      action: text('action').notNull(),
      entityType: text('entity_type'),
      entityId: text('entity_id'),
      details: text('details'),
      ipAddress: text('ip_address'),
      createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    });
