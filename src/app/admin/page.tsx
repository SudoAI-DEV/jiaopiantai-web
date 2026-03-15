import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth-utils";

export const metadata: Metadata = {
  title: "管理后台",
};
import { db } from "@/lib/db";
import { userProfiles, products, creditTransactions, productGeneratedImages } from "@/lib/db/schema";
import { eq, desc, sql, and, count } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getAdminDashboardData() {
  // Get total customers
  const customerCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(userProfiles)
    .where(eq(userProfiles.role, "customer"));

  // Get total products
  const productCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(products);

  // Get products by status
  const productStatsRaw = await db
    .select({
      status: products.status,
      count: sql<number>`count(*)`,
    })
    .from(products)
    .groupBy(products.status);

  const productStats: Record<string, number> = {};
  productStatsRaw.forEach((stat) => {
    productStats[stat.status || "draft"] = Number(stat.count);
  });

  // Get pending review count
  const pendingReviewCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(productGeneratedImages)
    .where(eq(productGeneratedImages.reviewStatus, "pending"));

  // Get recent products
  const recentProducts = await db
    .select({
      id: products.id,
      productNumber: products.productNumber,
      name: products.name,
      status: products.status,
      createdAt: products.createdAt,
      userId: products.userId,
    })
    .from(products)
    .orderBy(desc(products.createdAt))
    .limit(5);

  // Get user info for recent products
  const userIds = [...new Set(recentProducts.map(p => p.userId))];
  const usersData = await db
    .select({
      id: userProfiles.id,
      shopName: userProfiles.shopName,
    })
    .from(userProfiles)
    .where(sql`${userProfiles.id} IN (${userIds.map(id => `'${id}'`).join(',')})`);

  const userMap = new Map(usersData.map(u => [u.id, u.shopName]));

  // Get total credits in system
  const totalCredits = await db
    .select({ total: sql<number>`sum(${userProfiles.creditsBalance})` })
    .from(userProfiles);

  // Get recent transactions
  const recentTransactions = await db
    .select()
    .from(creditTransactions)
    .orderBy(desc(creditTransactions.createdAt))
    .limit(5);

  return {
    customerCount: Number(customerCount[0]?.count || 0),
    productCount: Number(productCount[0]?.count || 0),
    productStats,
    pendingReviewCount: Number(pendingReviewCount[0]?.count || 0),
    recentProducts: recentProducts.map(p => ({
      ...p,
      shopName: userMap.get(p.userId) || "未知",
    })),
    totalCredits: Number(totalCredits[0]?.total || 0),
    recentTransactions,
  };
}

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

const transactionLabels: Record<string, string> = {
  recharge: "充值",
  purchase: "购买",
  submission: "提交消耗",
  completion: "完成确认",
  refund: "退还",
};

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  const processingCount = (data.productStats.processing || 0) +
    (data.productStats.reviewing || 0) +
    (data.productStats.reworking || 0);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-[#4E342E]">
          管理后台
        </h1>
        <p className="text-gray-600 mt-1">平台运营概览</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Customers */}
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">客户总数</p>
            <p className="text-4xl font-bold text-[#4E342E] mt-2">
              {data.customerCount}
            </p>
            <Link
              href="/admin/customers"
              className="text-sm text-[#FDD835] hover:underline mt-1 inline-block"
            >
              查看客户
            </Link>
          </CardContent>
        </Card>

        {/* Total Products */}
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">产品总数</p>
            <p className="text-4xl font-bold text-[#4E342E] mt-2">
              {data.productCount}
            </p>
            <Link
              href="/admin/products"
              className="text-sm text-[#FDD835] hover:underline mt-1 inline-block"
            >
              查看产品
            </Link>
          </CardContent>
        </Card>

        {/* Processing */}
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-purple-600">处理中</p>
            <p className="text-4xl font-bold text-[#4E342E] mt-2">
              {processingCount}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              待审核: {data.productStats.reviewing || 0}
            </p>
          </CardContent>
        </Card>

        {/* Total Credits */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-green-600">系统总点数</p>
            <p className="text-4xl font-bold text-[#4E342E] mt-2">
              {data.totalCredits}
            </p>
            <Link
              href="/admin/credits"
              className="text-sm text-[#FDD835] hover:underline mt-1 inline-block"
            >
              管理点数
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/customers"
          className="p-4 bg-white rounded-xl shadow-sm border hover:border-[#FDD835] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <div>
              <p className="font-medium text-[#4E342E]">客户管理</p>
              <p className="text-sm text-gray-500">查看和管理客户</p>
            </div>
          </div>
        </Link>
        <Link
          href="/admin/products?status=reviewing"
          className="p-4 bg-white rounded-xl shadow-sm border hover:border-[#FDD835] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🖼️</span>
            <div>
              <p className="font-medium text-[#4E342E]">待审核图片</p>
              <p className="text-sm text-gray-500">{data.pendingReviewCount} 张待审核</p>
            </div>
          </div>
        </Link>
        <Link
          href="/admin/scenes"
          className="p-4 bg-white rounded-xl shadow-sm border hover:border-[#FDD835] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <div>
              <p className="font-medium text-[#4E342E]">场景模板</p>
              <p className="text-sm text-gray-500">管理 AI 生成场景</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">最近产品</CardTitle>
            <Link
              href="/admin/products"
              className="text-sm text-[#FDD835] hover:underline"
            >
              查看全部
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>暂无产品</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/admin/products/${product.id}/review`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-[#4E342E]">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {product.shopName} · {product.productNumber}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        statusColors[product.status || "draft"] || "bg-gray-100"
                      }`}
                    >
                      {statusLabels[product.status || "draft"] || product.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">最近交易</CardTitle>
            <Link
              href="/admin/credits"
              className="text-sm text-[#FDD835] hover:underline"
            >
              查看全部
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>暂无交易记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3"
                  >
                    <div>
                      <p className="font-medium text-[#4E342E]">
                        {transactionLabels[tx.type] || tx.type}
                      </p>
                      <p className="text-sm text-gray-500">
                        {tx.description || "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-medium ${
                          tx.amount > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.amount > 0 ? "+" : ""}
                        {tx.amount}
                      </p>
                      <p className="text-sm text-gray-500">
                        余额: {tx.balanceAfter}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">产品状态分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(data.productStats).map(([status, count]) => (
              <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-[#4E342E]">{count}</p>
                <p className="text-sm text-gray-500">{statusLabels[status] || status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
