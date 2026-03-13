import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { userProfiles, users, products, creditTransactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RechargeForm } from "./recharge-form";

async function getCustomerDetail(customerId: string) {
  const customer = await db
    .select({
      id: userProfiles.id,
      shopName: userProfiles.shopName,
      phone: userProfiles.phone,
      category: userProfiles.category,
      role: userProfiles.role,
      creditsBalance: userProfiles.creditsBalance,
      creditsFrozen: userProfiles.creditsFrozen,
      creditsTotalSpent: userProfiles.creditsTotalSpent,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(userProfiles)
    .leftJoin(users, eq(userProfiles.id, users.id))
    .where(eq(userProfiles.id, customerId));

  if (!customer[0]) return null;

  // Get product stats
  const customerProducts = await db
    .select({
      id: products.id,
      productNumber: products.productNumber,
      name: products.name,
      status: products.status,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(eq(products.userId, customerId))
    .orderBy(desc(products.createdAt))
    .limit(10);

  // Get recent transactions
  const transactions = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, customerId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(10);

  return {
    ...customer[0],
    products: customerProducts,
    transactions,
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

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerDetail(id);

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/customers"
            className="text-sm text-gray-600 hover:text-[#4E342E] flex items-center gap-1"
          >
            ← 返回客户列表
          </Link>
          <h1 className="text-2xl font-bold text-[#4E342E] mt-2">
            {customer.shopName || "客户详情"}
          </h1>
          <p className="text-gray-600">{customer.email}</p>
        </div>
      </div>

      {/* Customer Info & Credits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">客户信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">店铺名称</span>
              <span className="text-[#4E342E]">{customer.shopName || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">手机号</span>
              <span className="text-[#4E342E]">{customer.phone || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">主营类目</span>
              <span className="text-[#4E342E]">{customer.category || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">注册时间</span>
              <span className="text-[#4E342E]">
                {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString("zh-CN") : "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Credits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">点数余额</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">可用点数</span>
              <span className="text-2xl font-bold text-[#4E342E]">{customer.creditsBalance}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">冻结中</span>
              <span className="text-gray-600">{customer.creditsFrozen}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">累计消耗</span>
              <span className="text-gray-600">{customer.creditsTotalSpent}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recharge */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">充值点数</CardTitle>
          </CardHeader>
          <CardContent>
            <RechargeForm
              customerId={customer.id}
              currentBalance={customer.creditsBalance}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">最近产品</CardTitle>
          <Link
            href={`/admin/products?userId=${customer.id}`}
            className="text-sm text-[#FDD835] hover:underline"
          >
            查看全部
          </Link>
        </CardHeader>
        <CardContent>
          {customer.products.length === 0 ? (
            <p className="text-center py-8 text-gray-500">暂无产品</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">产品编号</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">名称</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">状态</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">创建时间</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customer.products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-[#4E342E]">{product.productNumber}</td>
                      <td className="px-4 py-3 text-sm text-[#4E342E]">{product.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[product.status] || "bg-gray-100"}`}>
                          {statusLabels[product.status] || product.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {product.createdAt ? new Date(product.createdAt).toLocaleDateString("zh-CN") : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/products/${product.id}/review`}
                          className="text-sm text-[#FDD835] hover:underline"
                        >
                          {product.status === "reviewing" || product.status === "processing" ? "审核" : "查看"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">最近交易记录</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.transactions.length === 0 ? (
            <p className="text-center py-8 text-gray-500">暂无交易记录</p>
          ) : (
            <div className="space-y-2">
              {customer.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-[#4E342E]">
                      {transactionLabels[tx.type] || tx.type}
                    </p>
                    <p className="text-sm text-gray-500">{tx.description || "-"}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </p>
                    <p className="text-sm text-gray-500">余额: {tx.balanceAfter}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
