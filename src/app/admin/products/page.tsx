import Link from "next/link";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { userProfiles, products } from "@/lib/db/schema";
import { eq, desc, sql, like, or, and } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminProductsClient } from "./admin-products-client";

const statusOptions = [
  { value: "", label: "全部状态" },
  { value: "draft", label: "草稿" },
  { value: "submitted", label: "已提交" },
  { value: "queued", label: "入队中" },
  { value: "processing", label: "生成中" },
  { value: "reviewing", label: "审核中" },
  { value: "client_reviewing", label: "待核对" },
  { value: "completed", label: "已完成" },
  { value: "failed", label: "失败" },
];

async function getProducts(search?: string, status?: string, userId?: string) {
  const conditions: any[] = [];

  if (search) {
    conditions.push(
      or(
        like(products.name, `%${search}%`),
        like(products.productNumber, `%${search}%`),
        like(userProfiles.shopName, `%${search}%`)
      )
    );
  }

  if (status) {
    conditions.push(eq(products.status, status as any));
  }

  if (userId) {
    conditions.push(eq(products.userId, userId));
  }

  const result = await db
    .select({
      id: products.id,
      productNumber: products.productNumber,
      name: products.name,
      category: products.category,
      status: products.status,
      deliveryCount: products.deliveryCount,
      userId: products.userId,
      createdAt: products.createdAt,
      shopName: userProfiles.shopName,
      email: userProfiles.id,
    })
    .from(products)
    .leftJoin(userProfiles, eq(products.userId, userProfiles.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(products.createdAt));
  return result;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; userId?: string }>;
}) {
  const { search, status, userId } = await searchParams;
  const productsList = await getProducts(search, status, userId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#4E342E]">产品管理</h1>
        <p className="text-gray-600">查看和管理所有产品</p>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2">
        <Input
          name="search"
          placeholder="搜索产品名称、编号、店铺..."
          defaultValue={search}
          className="max-w-xs"
        />
        <select
          name="status"
          defaultValue={status}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FDD835]"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-[#FDD835] text-[#4E342E] font-medium rounded-lg hover:bg-[#FDD835]/90"
        >
          筛选
        </button>
        {search || status ? (
          <Link
            href="/admin/products"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            清除
          </Link>
        ) : null}
      </form>

      <AdminProductsClient initialProducts={productsList as any} />
    </div>
  );
}
