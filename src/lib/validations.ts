import { z } from "zod";

// Common validation schemas

// UUID validation
export const uuidSchema = z.string().uuid();

// Product-related schemas
export const productIdSchema = z.object({
  id: uuidSchema,
});

export const createProductSchema = z.object({
  name: z.string().min(1, "产品名称不能为空").max(100, "产品名称不能超过100字"),
  category: z.enum([
    "clothing",
    "accessories",
    "shoes",
    "bags",
    "electronics",
    "home",
    "beauty",
    "food",
    "other",
  ], {
    message: "请选择有效的类目",
  }),
  description: z.string().max(500, "描述不能超过500字").optional(),
  shootingRequirements: z.string().max(1000, "拍摄需求不能超过1000字").optional(),
  stylePreference: z.enum(
    ["seaside-art", "country-garden", "urban-street", "architectural-editorial"],
    { message: "请选择有效的场景风格" }
  ),
  specialNotes: z.string().max(500, "特别说明不能超过500字").optional(),
  deliveryCount: z.number().int().min(1).max(20).default(6),
});

// Image review schemas
export const reviewImageSchema = z.object({
  status: z.enum(["approved", "rejected", "regenerate"], {
    message: "无效的审核状态",
  }),
});

// Credit-related schemas
export const rechargeSchema = z.object({
  userId: uuidSchema,
  amount: z.number().int().min(1, "充值数量至少为1").max(100, "单次最多充值100点"),
  note: z.string().max(200).optional(),
});

// Feedback schema
export const feedbackSchema = z.object({
  productId: uuidSchema,
  feedbackType: z.enum([
    "satisfied",
    "need_revision",
    "quality_issue",
    "style_not_match",
    "other",
  ], {
    message: "无效的反馈类型",
  }),
  description: z.string().max(500, "描述不能超过500字").optional(),
  imageIds: z.array(uuidSchema).optional(),
});

// File upload schema
export const presignedUrlSchema = z.object({
  fileName: z.string().min(1, "文件名不能为空").max(255, "文件名不能超过255字"),
  fileType: z.string().regex(/^image\/(jpeg|png|webp)$/, "仅支持 JPG、PNG、WEBP 格式"),
  fileSize: z.number().int().min(1).max(10 * 1024 * 1024, "文件大小不能超过10MB"),
  productId: uuidSchema.optional(),
});

// Helper to validate and return errors
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const firstError = result.error.issues[0];
  const message = firstError
    ? `${firstError.path.join(".")}: ${firstError.message}`
    : "验证失败";

  return { success: false, error: message };
}

// Sanitize string input - remove potential XSS vectors
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}
