import Link from "next/link";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { userProfiles, users, creditTransactions } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getCreditsData() {
  // Get all customers with credits
  const customers = await db
    .select({
      id: userProfiles.id,
      shopName: userProfiles.shopName,
      email: users.email,
      creditsBalance: userProfiles.creditsBalance,
      creditsFrozen: userProfiles.creditsFrozen,
      creditsTotalSpent: userProfiles.creditsTotalSpent,
    })
    .from(userProfiles)
    .leftJoin(users, eq(userProfiles.id, users.id))
    .where(eq(userProfiles.role, "customer"))
    .orderBy(desc(userProfiles.creditsBalance));

  // Get total credits
  const totalCredits = await db
    .select({ total: sql<number>`sum(${userProfiles.creditsBalance})` })
    .from(userProfiles);

  const totalFrozen = await db
    .select({ total: sql<number>`sum(${userProfiles.creditsFrozen})` })
    .from(userProfiles);

  // Get recent transactions
  const recentTransactions = await db
    .select()
    .from(creditTransactions)
    .orderBy(desc(creditTransactions.createdAt))
    .limit(20);

  // Get user info for transactions
  const userIds = [...new Set(recentTransactions.map(t => t.userId))];
  const usersData = await db
    .select({
      id: userProfiles.id,
      shopName: userProfiles.shopName,
    })
    .from(userProfiles)
    .where(sql`${userProfiles.id} IN (${userIds.map(id => `'${id}'`).join(',')})`);

  const userMap = new Map(usersData.map(u => [u.id, u.shopName]));

  return {
    customers,
    totalCredits: Number(totalCredits[0]?.total || 0),
    totalFrozen: Number(totalFrozen[0]?.total || 0),
    recentTransactions: recentTransactions.map(t => ({
      ...t,
      shopName: userMap.get(t.userId) || "未知",
    })),
  };
}

const transactionLabels: Record<string, string> = {
  recharge: "充值",
  purchase: "购买",
  submission: "提交消耗",
  completion: "完成确认",
  refund: "退还",
};

export default async function AdminCreditsPage() {
  const data = await getCreditsData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#4E342E]">点数管理</h1>
        <p className="text-gray-600">平台点数总览和管理</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-[#FDD835] to-[#FFC107] border-0">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[#4E342E]/70">系统总点数</p>
            <p className="text-4xl font-bold text-[#4E342E] mt-2">
              {data.totalCredits}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">冻结中</p>
            <p className="text-4xl font-bold text-[#4E342E] mt-2">
              {data.totalFrozen}
            </p>
            <p className="text-sm text-gray-500 mt-1">等待任务完成</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">活跃客户</p>
            <p className="text-4xl font-bold text-[#4E342E] mt-2">
              {data.customers.length}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              有点数余额的客户
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">客户点数余额</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">客户</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">店铺</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">可用点数</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">冻结</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">累计消耗</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      暂无客户数据
                    </td>
                  </tr>
                ) : (
                  data.customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-[#4E342E]">{customer.email}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {customer.shopName || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-[#4E342E]">
                          {customer.creditsBalance}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {customer.creditsFrozen}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {customer.creditsTotalSpent}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="text-[#FDD835] hover:underline text-sm"
                        >
                          充值
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">最近交易记录</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentTransactions.length === 0 ? (
            <p className="text-center py-8 text-gray-500">暂无交易记录</p>
          ) : (
            <div className="space-y-2">
              {data.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-[#4E342E]">
                      {transactionLabels[tx.type] || tx.type}
                    </p>
                    <p className="text-sm text-gray-500">
                      {tx.shopName} · {tx.description || "-"}
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
                      {tx.createdAt
                        ? new Date(tx.createdAt).toLocaleString("zh-CN")
                        : "-"}
                    </p>
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
