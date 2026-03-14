import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth-utils";

export const metadata: Metadata = {
  title: "客户管理",
};
import { db } from "@/lib/db";
import { userProfiles, users, products, creditTransactions } from "@/lib/db/schema";
import { eq, desc, sql, like, or, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

async function getCustomers(search?: string) {
  const conditions = [eq(userProfiles.role, "customer") as any];

  if (search) {
    conditions.push(
      or(
        like(users.email, `%${search}%`),
        like(userProfiles.shopName, `%${search}%`),
        like(userProfiles.phone, `%${search}%`)
      ) as any
    );
  }

  const customers = await db
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
    })
    .from(userProfiles)
    .leftJoin(users, eq(userProfiles.id, users.id))
    .where(and(...conditions) as any)
    .orderBy(desc(userProfiles.id));

  // Get product counts for each customer
  const customerIds = customers.map(c => c.id);
  const productCounts = await db
    .select({
      userId: products.userId,
      count: sql<number>`count(*)`,
    })
    .from(products)
    .where(sql`${products.userId} IN (${customerIds.map(id => `'${id}'`).join(',')})`)
    .groupBy(products.userId);

  const productCountMap = new Map(productCounts.map(p => [p.userId, Number(p.count)]));

  return customers.map(c => ({
    ...c,
    productCount: productCountMap.get(c.id) || 0,
  }));
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const customers = await getCustomers(search);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4E342E]">客户管理</h1>
          <p className="text-gray-600">管理平台客户信息</p>
        </div>
      </div>

      {/* Search */}
      <form className="flex gap-2">
        <Input
          name="search"
          placeholder="搜索客户邮箱、店铺名、手机号..."
          defaultValue={search}
          className="max-w-md"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-[#FDD835] text-[#4E342E] font-medium rounded-lg hover:bg-[#FDD835]/90"
        >
          搜索
        </button>
      </form>

      {/* Customer List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">客户</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">店铺</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">类目</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">可用点数</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">冻结</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">累计消耗</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">产品数</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      暂无客户数据
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-[#4E342E]">{customer.email}</p>
                          {customer.phone && (
                            <p className="text-sm text-gray-500">{customer.phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#4E342E]">{customer.shopName || "-"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-600">{customer.category || "-"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-[#4E342E]">{customer.creditsBalance}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-500">{customer.creditsFrozen}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-600">{customer.creditsTotalSpent}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/products?userId=${customer.id}`}
                          className="text-[#FDD835] hover:underline"
                        >
                          {customer.productCount}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="text-[#FDD835] hover:underline text-sm"
                        >
                          查看详情
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
    </div>
  );
}
