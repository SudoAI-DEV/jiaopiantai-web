import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { userProfiles, products, productSourceImages, productGeneratedImages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import Image from "next/image";
import { ReviewActions } from "./review-actions";
import { ReviewClient } from "./review-client";

const categoryLabels: Record<string, string> = {
  clothing: "服装",
  accessories: "饰品",
  shoes: "鞋类",
  bags: "箱包",
  electronics: "电子产品",
  home: "家居用品",
  beauty: "美妆护肤",
  food: "食品饮料",
  other: "其他",
};

const statusLabels: Record<string, string> = {
  draft: "草稿",
  submitted: "已提交",
  queued: "入队中",
  processing: "生成中",
  reviewing: "审核中",
  client_reviewing: "待核对",
  feedback_received: "待返工",
  reworking: "返工中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-600",
  queued: "bg-indigo-100 text-indigo-600",
  processing: "bg-yellow-100 text-yellow-600",
  reviewing: "bg-purple-100 text-purple-600",
  client_reviewing: "bg-teal-100 text-teal-600",
  feedback_received: "bg-orange-100 text-orange-600",
  reworking: "bg-orange-100 text-orange-600",
  completed: "bg-green-100 text-green-600",
  failed: "bg-red-100 text-red-600",
  cancelled: "bg-gray-100 text-gray-600",
};

async function getProductForReview(productId: string) {
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });

  if (!product) return null;

  const user = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, product.userId),
  });

  const sourceImages = await db
    .select()
    .from(productSourceImages)
    .where(eq(productSourceImages.productId, productId))
    .orderBy(productSourceImages.sortOrder);

  const generatedImages = await db
    .select()
    .from(productGeneratedImages)
    .where(eq(productGeneratedImages.productId, productId))
    .orderBy(asc(productGeneratedImages.sortOrder));

  return {
    product,
    user,
    sourceImages,
    generatedImages,
  };
}

export default async function ProductReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProductForReview(id);

  if (!data) {
    notFound();
  }

  const { product, user, sourceImages, generatedImages } = data;

  const approvedImages = generatedImages.filter((img) => img.reviewStatus === "approved");
  const canDeliver = approvedImages.length >= (product.deliveryCount || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/products"
            className="text-sm text-gray-600 hover:text-[#4E342E] flex items-center gap-1"
          >
            ← 返回产品列表
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-bold text-[#4E342E]">{product.name}</h1>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">
              {product.productNumber}
            </span>
          </div>
          <p className="text-gray-600 mt-1">
            {user?.shopName || "未知客户"} · {categoryLabels[product.category] || product.category} ·{" "}
            <span className={statusColors[product.status || "draft"]}>
              {statusLabels[product.status || "draft"] || product.status}
            </span>
          </p>
        </div>

        {/* Deliver Button */}
        {canDeliver && product.status === "reviewing" && (
          <ReviewActions
            productId={product.id}
            productStatus={product.status}
            approvedCount={approvedImages.length}
            deliveryCount={product.deliveryCount || 0}
          />
        )}
      </div>

      {/* Product Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#4E342E] mb-4">产品信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">拍摄需求</span>
            <p className="text-[#4E342E]">{product.shootingRequirements}</p>
          </div>
          {product.specialNotes && (
            <div>
              <span className="text-gray-500">特别注意事项</span>
              <p className="text-[#4E342E]">{product.specialNotes}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">期望交付</span>
            <p className="text-[#4E342E]">
              {product.deliveryCount || 0} 张 (当前通过: {approvedImages.length})
            </p>
          </div>
        </div>
      </div>

      {/* Source Images */}
      {sourceImages.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#4E342E] mb-4">
            原始图片 ({sourceImages.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sourceImages.map((img) => (
              <div
                key={img.id}
                className="aspect-square relative rounded-lg overflow-hidden bg-gray-100"
              >
                <Image
                  src={img.url}
                  alt={img.fileName || ""}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Images - Client Component */}
      <ReviewClient
        productId={product.id}
        generatedImages={generatedImages}
        productStatus={product.status}
        deliveryCount={product.deliveryCount || 0}
        approvedCount={approvedImages.length}
      />
    </div>
  );
}
