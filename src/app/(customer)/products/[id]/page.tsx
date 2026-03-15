import Link from "next/link";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { products, productSourceImages, productGeneratedImages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { TaskStatusPoller } from "@/components/task-status-poller";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { SubmitProductButton } from "./submit-product-button";

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

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user) return null;

  const { id } = await params;

  const product = await db.query.products.findFirst({
    where: and(eq(products.id, id), eq(products.userId, session.user.id)),
  });

  if (!product) {
    notFound();
  }

  const [sourceImages, generatedImages] = await Promise.all([
    db
      .select()
      .from(productSourceImages)
      .where(eq(productSourceImages.productId, id))
      .orderBy(productSourceImages.sortOrder),
    db
      .select()
      .from(productGeneratedImages)
      .where(eq(productGeneratedImages.productId, id))
      .orderBy(productGeneratedImages.sortOrder),
  ]);

  const approvedImages = generatedImages.filter(
    (img) => img.reviewStatus === "approved"
  );

  // Polling statuses - refresh when in these states
  const pollingStatuses = ["submitted", "queued", "processing"];

  return (
    <div className="space-y-6">
      {/* Task Status Poller - only active during async processing */}
      {pollingStatuses.includes(product.status || "draft") && (
        <TaskStatusPoller productId={product.id} statuses={pollingStatuses} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/products"
            className="text-sm text-gray-600 hover:text-[#4E342E] flex items-center gap-1"
          >
            ← 返回产品列表
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-bold text-[#4E342E]">
              {product.name}
            </h1>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">
              {product.productNumber}
            </span>
          </div>
          <p className="text-gray-600 mt-1">
            {categoryLabels[product.category] || product.category} ·{" "}
            {statusLabels[product.status || "draft"] || product.status}
          </p>
        </div>

        {product.status === "draft" && (
          <SubmitProductButton productId={id} />
        )}
      </div>

      {/* Product Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#4E342E] mb-4">
          产品信息
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">产品名称</span>
            <p className="text-[#4E342E]">{product.name}</p>
          </div>
          <div>
            <span className="text-gray-500">产品类目</span>
            <p className="text-[#4E342E]">
              {categoryLabels[product.category] || product.category}
            </p>
          </div>
          {product.description && (
            <div className="md:col-span-2">
              <span className="text-gray-500">产品描述</span>
              <p className="text-[#4E342E]">{product.description}</p>
            </div>
          )}
          <div className="md:col-span-2">
            <span className="text-gray-500">拍摄需求</span>
            <p className="text-[#4E342E]">{product.shootingRequirements}</p>
          </div>
          {product.specialNotes && (
            <div className="md:col-span-2">
              <span className="text-gray-500">特别注意事项</span>
              <p className="text-[#4E342E]">{product.specialNotes}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">期望交付</span>
            <p className="text-[#4E342E]">{product.deliveryCount} 张</p>
          </div>
        </div>
      </div>

      {/* Source Images */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#4E342E] mb-4">
          原始图片 ({sourceImages.length})
        </h2>
        {sourceImages.length === 0 ? (
          <p className="text-gray-500">暂无原始图片</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sourceImages.map((img) => (
              <div
                key={img.id}
                className="aspect-square relative rounded-lg overflow-hidden bg-gray-100"
              >
                <OptimizedImage
                  src={img.url}
                  alt={img.fileName || ""}
                  fill
                  aspectRatio="auto"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generated Images */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#4E342E]">
            生成结果 ({approvedImages.length}/{product.deliveryCount})
          </h2>
        </div>

        {product.status === "reviewing" ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-gray-500">
              等待审核完成，请稍后再来查看...
            </p>
          </div>
        ) : generatedImages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🎨</div>
            <p className="text-gray-500">
              {product.status === "draft"
                ? "请先提交产品"
                : product.status === "processing"
                ? "AI 正在生成中，请稍候..."
                : "等待生成..."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {generatedImages.map((img) => (
              <div
                key={img.id}
                className={`relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 ${
                  img.reviewStatus === "approved"
                    ? "ring-2 ring-green-500"
                    : img.reviewStatus === "rejected"
                    ? "opacity-50"
                    : ""
                }`}
              >
                <OptimizedImage
                  src={img.url}
                  alt="Generated"
                  fill
                  aspectRatio="3/4"
                />
                {img.reviewStatus === "approved" && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    ✓ 已通过
                  </div>
                )}
                {img.reviewStatus === "rejected" && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    ✗ 已淘汰
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Download Section */}
        {approvedImages.length > 0 && (product.status === "completed" || product.status === "client_reviewing") && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <p className="text-gray-600">
                已通过 {approvedImages.length} 张精选图片
              </p>
              <div className="flex gap-2">
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  批量下载
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
