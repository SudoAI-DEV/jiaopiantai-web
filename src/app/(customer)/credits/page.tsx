import Link from "next/link";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { userProfiles, creditTransactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const transactionLabels: Record<string, string> = {
  recharge: "充值",
  purchase: "购买",
  submission: "提交消耗",
  completion: "完成确认",
  refund: "退还",
};

export default async function CreditsPage() {
  const session = await getSession();
  if (!session?.user) return null;

  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, session.user.id),
  });

  if (!profile) return null;

  const transactions = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, session.user.id))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#4E342E]">我的点数</h1>
        <p className="text-gray-600">查看点数余额和交易记录</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-[#FDD835] to-[#FFC107] border-0">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-[#4E342E]/70">可用点数</p>
            <p className="text-4xl font-bold text-[#4E342E] mt-2">
              {profile.creditsBalance}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">冻结中</p>
            <p className="text-4xl font-bold text-[#4E342E] mt-2">
              {profile.creditsFrozen}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              提交产品后冻结
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">累计消耗</p>
            <p className="text-4xl font-bold text-[#4E342E] mt-2">
              {profile.creditsTotalSpent}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              已完成产品
            </p>
          </CardContent>
        </Card>
      </div>

      {/* How to get credits */}
      <Card>
        <CardHeader>
          <CardTitle>如何获得点数？</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#FDD835]/20 rounded-full flex items-center justify-center text-[#4E342E] font-bold">
                1
              </div>
              <div>
                <p className="font-medium text-[#4E342E]">联系客服购买</p>
                <p className="text-sm text-gray-500">
                  添加微信或电话联系客服购买点数套餐
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#FDD835]/20 rounded-full flex items-center justify-center text-[#4E342E] font-bold">
                2
              </div>
              <div>
                <p className="font-medium text-[#4E342E]">管理员充值</p>
                <p className="text-sm text-gray-500">
                  购买后管理员将为您充值点数到账户
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>交易记录</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">暂无交易记录</p>
          ) : (
            <div className="divide-y">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium text-[#4E342E]">
                      {transactionLabels[tx.type] || tx.type}
                    </p>
                    <p className="text-sm text-gray-500">
                      {tx.description || "-"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {tx.createdAt.toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
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
  );
}
