import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { customerModels } from "./db/schema";
import { getPublicUrl } from "./r2";

export type CustomerModelRecord = typeof customerModels.$inferSelect;
export type CustomerModelDb = typeof db;

function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim();
  const normalized = trimmed.length > 0 ? trimmed : "model-image";
  return normalized
    .replace(/^.*[\\/]/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

export function buildCustomerModelFileKey(params: {
  userId: string;
  modelId: string;
  fileName: string;
}): string {
  const fileName = sanitizeFileName(params.fileName);
  return `models/${params.userId}/${params.modelId}/${fileName}`;
}

export function getStoredFileUrl(key: string): string {
  const publicDomain = process.env.R2_PUBLIC_DOMAIN?.trim();
  return publicDomain
    ? `${publicDomain.replace(/\/+$/, "")}/${key}`
    : getPublicUrl(key);
}

export async function getOwnedCustomerModel(
  database: CustomerModelDb,
  params: {
    userId: string;
    modelId: string;
  }
): Promise<CustomerModelRecord | null> {
  const model = await database.query.customerModels.findFirst({
    where: and(
      eq(customerModels.id, params.modelId),
      eq(customerModels.userId, params.userId)
    ),
  });
  return model ?? null;
}

export async function listCustomerModels(
  database: CustomerModelDb,
  userId: string
): Promise<CustomerModelRecord[]> {
  return database.query.customerModels.findMany({
    where: eq(customerModels.userId, userId),
  });
}

export async function listActiveCustomerModels(
  database: CustomerModelDb,
  userId: string
): Promise<CustomerModelRecord[]> {
  return database.query.customerModels.findMany({
    where: and(
      eq(customerModels.userId, userId),
      eq(customerModels.isActive, true)
    ),
  });
}

export async function pickRandomActiveCustomerModel(
  database: CustomerModelDb,
  userId: string
): Promise<CustomerModelRecord | null> {
  const models = await listActiveCustomerModels(database, userId);
  if (models.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * models.length);
  return models[index] ?? null;
}
