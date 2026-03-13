import Link from "next/link";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { userProfiles, products, creditTransactions } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getDashboardData() {
  const session = await getSession();
  if (!session?.user) return null;

  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, session.user.id),
  });

  if (!profile) return null;

  // Get product stats by status
  const productStatsRaw = await db
    .select({
      status: products.status,
      count: sql<number>`count(*)`,
    })
    .from(products)
    .where(eq(products.userId, session.user.id))
    .groupBy(products.status);

  const productStats: Record<string, number> = {};
  productStatsRaw.forEach((stat) => {
    productStats[stat.status] = Number(stat.count);
  });

  // Get recent products
  const recentProducts = await db
    .select({
      id: products.id,
      productNumber: products.productNumber,
      name: products.name,
      status: products.status,
      deliveryCount: products.deliveryCount,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(eq(products.userId, session.user.id))
    .orderBy(desc(products.createdAt))
    .limit(5);

  // Get recent transactions
  const recentTransactions = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, session.user.id))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(5);

  return {
    profile,
    productStats,
    recentProducts,
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

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    return <div>加载中...</div>;
  }

  const { profile, productStats, recentProducts, recentTransactions } = data;
  const totalProducts = Object.values(productStats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-[#4E342E]">
          欢迎回来，{profile.shopName || profile.id.slice(0, 8)}！
        </h1>
        <p className="text-gray-600 mt-1">这里是您的仪表盘概览</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Points Balance */}
        <Card className="bg-gradient-to-br from-[#FDD835] to-[#FFC107] border-0">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[#4E342E]/70">可用点数</p>
            <p className="text-4xl font-bold text-[#4E342E] mt-2">
              {profile.creditsBalance}
            </p>
            <p className="text-sm text-[#4E342E]/60 mt-1">
              冻结中: {profile.creditsFrozen}
            </p>
          </CardContent>
        </Card>

        {/* Total Products */}
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">累计产品</p>
            <p className="text-4xl font-bold text-[#4E342E] mt-2">
              {totalProducts}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              已完成: {productStats.completed || 0}
            </p>
          </CardContent>
        </Card>

        {/* Processing */}
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">处理中</p>
            <p className="text-4xl font-bold text-[#4E342E] mt-2">
              {(productStats.processing || 0) +
                (productStats.reviewing || 0) +
                (productStats.reworking || 0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              待审核: {productStats.reviewing || 0}
            </p>
          </CardContent>
        </Card>

        {/* New Product CTA */}
        <Card className="bg-[#4E342E] border-0 cursor-pointer hover:opacity-90 transition-opacity">
          <Link href="/products/new">
            <CardContent className="p-6 text-center">
              <p className="text-4xl font-bold text-white mt-2">+</p>
              <p className="text-white font-medium mt-2">新建产品</p>
              <p className="text-white/60 text-sm mt-1">
                创建一个新的商品图任务
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">最近产品</CardTitle>
            <Link
              href="/products"
              className="text-sm text-[#FDD835] hover:underline"
            >
              查看全部
            </Link>
          </CardHeader>
          <CardContent>
            {recentProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>暂无产品</p>
                <Link
                  href="/products/new"
                  className="text-[#FDD835] hover:underline mt-2 inline-block"
                >
                  立即创建第一个产品
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-[#4E342E]">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        编号: {product.productNumber}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        statusColors[product.status] || "bg-gray-100"
                      }`}
                    >
                      {statusLabels[product.status] || product.status}
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
              href="/credits"
              className="text-sm text-[#FDD335] hover:underline"
            >
              查看全部
            </Link>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>暂无交易记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
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
    </div>
  );
}
