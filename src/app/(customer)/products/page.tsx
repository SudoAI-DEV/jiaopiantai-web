import Link from "next/link";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { products, productSourceImages, type ProductStatus } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GridImage } from "@/components/ui/optimized-image";

const statusOptions = [
  { value: "", label: "全部" },
  { value: "draft", label: "草稿" },
  { value: "submitted", label: "已提交" },
  { value: "processing", label: "生成中" },
  { value: "reviewing", label: "审核中" },
  { value: "client_reviewing", label: "待核对" },
  { value: "completed", label: "已完成" },
];

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

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session = await getSession();
  if (!session?.user) return null;

  const status = searchParams.status || "";
  const page = parseInt(searchParams.page || "1");
  const limit = 10;
  const offset = (page - 1) * limit;

  const conditions = [eq(products.userId, session.user.id)];
  if (status) {
    conditions.push(eq(products.status, status as ProductStatus || "draft"));
  }

  const [productsList, totalCount] = await Promise.all([
    db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions)),
  ]);

  // Get first image for each product
  const productIds = productsList.map(p => p.id);
  const allSourceImages = productIds.length > 0 
    ? await db.select().from(productSourceImages).where(
      sql`${productSourceImages.productId} IN (${productIds})`
    )
    : [];
  
  // Group images by productId
  const imagesByProductId: Record<string, typeof productSourceImages.$inferSelect> = {};
  allSourceImages.forEach(img => {
    if (!imagesByProductId[img.productId]) {
      imagesByProductId[img.productId] = img;
    }
  });

  const total = totalCount[0]?.count || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4E342E]">产品管理</h1>
          <p className="text-gray-600">管理您的商品图任务</p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex items-center justify-center px-4 py-2 bg-[#FDD835] text-[#4E342E] font-medium rounded-lg hover:bg-[#FDD835]/90 transition-colors"
        >
          + 新建产品
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {statusOptions.map((opt) => (
          <Link
            key={opt.value}
            href={opt.value ? `/products?status=${opt.value}` : "/products"}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              (status || "") === opt.value
                ? "bg-[#4E342E] text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {/* Products List */}
      {productsList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-[#4E342E]">暂无产品</h3>
            <p className="text-gray-500 mt-1">创建一个新的商品图任务开始使用</p>
            <Link
              href="/products/new"
              className="inline-flex items-center mt-4 px-4 py-2 bg-[#FDD835] text-[#4E342E] font-medium rounded-lg hover:bg-[#FDD835]/90 transition-colors"
            >
              + 新建产品
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {productsList.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {imagesByProductId[product.id] ? (
                        <img
                          src={imagesByProductId[product.id].url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-[#4E342E]">
                          {product.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            statusColors[product.status || "draft"] || "bg-gray-100"
                          }`}
                        >
                          {statusLabels[product.status || "draft"] || product.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>编号: {product.productNumber}</span>
                        <span>
                          类目:{" "}
                          {categoryLabels[product.category] || product.category}
                        </span>
                        <span>交付: {product.deliveryCount}张</span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>
                        {product.createdAt.toLocaleDateString("zh-CN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/products?page=${page - 1}${status ? `&status=${status}` : ""}`}
              className="px-3 py-1 bg-white rounded-lg text-sm hover:bg-gray-100"
            >
              上一页
            </Link>
          )}
          <span className="px-3 py-1 text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/products?page=${page + 1}${status ? `&status=${status}` : ""}`}
              className="px-3 py-1 bg-white rounded-lg text-sm hover:bg-gray-100"
            >
              下一页
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
