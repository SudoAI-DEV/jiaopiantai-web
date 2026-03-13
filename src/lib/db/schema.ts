// Re-export the appropriate schema based on database type
// For build time, default to PostgreSQL schema
import * as pgSchema from './schema-pg';
import * as sqliteSchema from './schema-sqlite';

// Determine which schema to use
// At build time, we'll use PostgreSQL schema for Vercel
const usePostgres = process.env.DATABASE_URL?.startsWith('postgresql') || process.env.VERCEL === '1';

export const users = usePostgres ? pgSchema.users : sqliteSchema.users;
export const sessions = usePostgres ? pgSchema.sessions : sqliteSchema.sessions;
export const accounts = usePostgres ? pgSchema.accounts : sqliteSchema.accounts;
export const verifications = usePostgres ? pgSchema.verifications : sqliteSchema.verifications;
export const userProfiles = usePostgres ? pgSchema.userProfiles : sqliteSchema.userProfiles;
export type UserProfile = usePostgres ? pgSchema.UserProfile : sqliteSchema.UserProfile;
export type NewUserProfile = usePostgres ? pgSchema.NewUserProfile : sqliteSchema.NewUserProfile;

export const creditTransactions = usePostgres ? pgSchema.creditTransactions : sqliteSchema.creditTransactions;
export type CreditTransaction = usePostgres ? pgSchema.CreditTransaction : sqliteSchema.CreditTransaction;

export const products = usePostgres ? pgSchema.products : sqliteSchema.products;
export type Product = usePostgres ? pgSchema.Product : sqliteSchema.Product;
export type ProductStatus = Product['status'];

export const productSourceImages = usePostgres ? pgSchema.productSourceImages : sqliteSchema.productSourceImages;
export type ProductSourceImage = usePostgres ? pgSchema.ProductSourceImage : sqliteSchema.ProductSourceImage;

export const productGeneratedImages = usePostgres ? pgSchema.productGeneratedImages : sqliteSchema.productGeneratedImages;
export type ProductGeneratedImage = usePostgres ? pgSchema.ProductGeneratedImage : sqliteSchema.ProductGeneratedImage;

export const imageFeedbacks = usePostgres ? pgSchema.imageFeedbacks : sqliteSchema.imageFeedbacks;

export const styleTemplates = usePostgres ? pgSchema.styleTemplates : sqliteSchema.styleTemplates;
export type StyleTemplate = usePostgres ? pgSchema.StyleTemplate : sqliteSchema.StyleTemplate;

export const productStyleSelections = usePostgres ? pgSchema.productStyleSelections : sqliteSchema.productStyleSelections;

export const deliveryBatches = usePostgres ? pgSchema.deliveryBatches : sqliteSchema.deliveryBatches;

export const deliveryImages = usePostgres ? pgSchema.deliveryImages : sqliteSchema.deliveryImages;

export const aiGenerationTasks = usePostgres ? pgSchema.aiGenerationTasks : sqliteSchema.aiGenerationTasks;
export type AIGenerationTask = usePostgres ? pgSchema.AIGenerationTask : sqliteSchema.AIGenerationTask;

export const operationLogs = usePostgres ? pgSchema.operationLogs : sqliteSchema.operationLogs;

// Re-export relations from both schemas
export const relations = pgSchema.relations;
