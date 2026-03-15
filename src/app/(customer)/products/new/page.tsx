import Link from "next/link";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SCENES } from "@/lib/scenes";
import { NewProductForm } from "./new-product-form";

async function getUserCredits() {
  const session = await getSession();
  if (!session?.user) return 0;

  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, session.user.id),
  });

  return profile?.creditsBalance || 0;
}

const CATEGORIES = [
  { value: "clothing", label: "服装" },
  { value: "accessories", label: "饰品" },
  { value: "shoes", label: "鞋类" },
  { value: "bags", label: "箱包" },
  { value: "electronics", label: "电子产品" },
  { value: "home", label: "家居用品" },
  { value: "beauty", label: "美妆护肤" },
  { value: "food", label: "食品饮料" },
  { value: "other", label: "其他" },
];

export default async function NewProductPage() {
  const credits = await getUserCredits();

  return (
    <div className="w-full overflow-x-hidden">
      <div className="mb-6">
        <Link
          href="/products"
          className="text-sm text-gray-600 hover:text-[#4E342E] flex items-center gap-1"
        >
          ← 返回产品列表
        </Link>
        <h1 className="text-2xl font-bold text-[#4E342E] mt-2">新建产品</h1>
        <p className="text-gray-600">填写产品信息开始创建商品图任务</p>
      </div>

      {credits < 1 ? (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-medium text-orange-800">点数不足</h3>
          <p className="text-orange-600 mt-1">
            创建产品需要消耗 1 点数，请联系管理员充值
          </p>
          <Link
            href="/credits"
            className="inline-block mt-4 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
          >
            查看点数详情
          </Link>
        </div>
      ) : (
        <NewProductForm
          categories={CATEGORIES}
          sceneTemplates={[...SCENES]}
          availableCredits={credits}
        />
      )}
    </div>
  );
}
