import Link from "next/link";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { users, userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user) return null;

  const [user, profile] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    }),
    db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, session.user.id),
    }),
  ]);

  if (!user || !profile) return null;

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#4E342E]">个人信息</h1>
        <p className="text-gray-600">查看和管理您的账户信息</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>账户信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-500">邮箱</span>
            <span className="text-[#4E342E]">{user.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-500">姓名</span>
            <span className="text-[#4E342E]">{user.name || "-"}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-500">注册时间</span>
            <span className="text-[#4E342E]">
              {user.createdAt.toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Shop Info */}
      <Card>
        <CardHeader>
          <CardTitle>店铺信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-500">店铺名称</span>
            <span className="text-[#4E342E]">{profile.shopName || "-"}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-500">联系电话</span>
            <span className="text-[#4E342E]">{profile.phone || "-"}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-500">主营类目</span>
            <span className="text-[#4E342E]">
              {profile.category ? categoryLabels[profile.category] || profile.category : "-"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Credits Summary */}
      <Card>
        <CardHeader>
          <CardTitle>点数概况</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-500">可用点数</span>
            <span className="text-[#4E342E] font-semibold">
              {profile.creditsBalance} 点
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-500">冻结中</span>
            <span className="text-[#4E342E]">{profile.creditsFrozen} 点</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-500">累计消耗</span>
            <span className="text-[#4E342E]">{profile.creditsTotalSpent} 点</span>
          </div>
          <Link
            href="/credits"
            className="block text-center mt-4 text-[#FDD835] hover:underline"
          >
            查看详细交易记录 →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
