"use client";

import { type KeyboardEvent, type MouseEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  productNumber: string;
  batchNumber: number | null;
  name: string;
  category: string;
  status: string;
  deliveryCount: number;
  userId: string;
  createdAt: Date | null;
  shopName: string | null;
  firstImageUrl: string | null;
}

interface AdminProductsClientProps {
  initialProducts: Product[];
}

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

export function AdminProductsClient({ initialProducts }: AdminProductsClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const getProductHref = (productId: string) => `/admin/products/${productId}/review`;

  const stopRowNavigation = (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const navigateToProduct = (productId: string) => {
    router.push(getProductHref(productId));
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, productId: string) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    navigateToProduct(productId);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个产品吗？此操作不可恢复。`)) {
      return;
    }

    setLoading(true);
    try {
      const results = await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/admin/products/${id}`, {
            method: "DELETE",
          })
        )
      );

      const allSuccess = results.every((res) => res.ok);
      if (!allSuccess) {
        throw new Error("部分删除失败");
      }

      setProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      alert("批量删除失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-6">
      {/* Batch Actions Bar */}
      {products.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === products.length && products.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-[#FDD835] focus:ring-[#FDD835]"
              />
              <span className="text-sm text-gray-600">
                全选 ({products.length})
              </span>
            </label>
            {selectedCount > 0 && (
              <span className="text-sm text-blue-600 font-medium">
                已选择 {selectedCount} 个
              </span>
            )}
          </div>
          {selectedCount > 0 && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBatchDelete}
                disabled={loading}
              >
                {loading ? "删除中..." : `批量删除 (${selectedCount})`}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
              >
                取消选择
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Product List */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">参考图</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">产品编号</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">批次</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">产品名称</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">客户</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">类目</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">期望交付</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">状态</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">创建时间</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    暂无产品数据
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    tabIndex={0}
                    role="link"
                    aria-label={`打开 ${product.name} 的审核详情`}
                    onClick={() => navigateToProduct(product.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, product.id)}
                    className={`cursor-pointer border-l-2 transition-colors outline-none hover:bg-[#FFF9EF] focus-visible:bg-[#FFF4CC] ${
                      selectedIds.has(product.id)
                        ? "border-l-[#FDD835] bg-[#FFF8DA]"
                        : "border-l-transparent"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        onClick={stopRowNavigation}
                        onKeyDown={stopRowNavigation}
                        className="w-4 h-4 rounded border-gray-300 text-[#FDD835] focus:ring-[#FDD835]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-14 w-14 overflow-hidden rounded-xl border border-[#E6DDD1] bg-[#F6F0E7] shadow-[0_8px_18px_rgba(78,52,46,0.08)]">
                        {product.firstImageUrl ? (
                          <img
                            src={product.firstImageUrl}
                            alt={`${product.name} 首图`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-[#9C8B7E]">
                            无图
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#4E342E]">
                      {product.productNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {product.batchNumber ? (
                        <span className="inline-flex rounded-full bg-[#F6EFD8] px-2.5 py-1 text-xs font-medium text-[#8B6A1C]">
                          第 {product.batchNumber} 批
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#4E342E]">{product.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {product.shopName || product.userId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {categoryLabels[product.category] || product.category}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {product.deliveryCount} 张
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          statusColors[product.status || "draft"] || "bg-gray-100"
                        }`}
                      >
                        {statusLabels[product.status || "draft"] || product.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {product.createdAt
                        ? new Date(product.createdAt).toLocaleDateString("zh-CN")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={getProductHref(product.id)}
                        onClick={stopRowNavigation}
                        className="text-[#C69200] hover:underline text-sm font-medium"
                      >
                        {product.status === "reviewing" ||
                        product.status === "processing" ||
                        product.status === "submitted" ||
                        product.status === "queued"
                          ? "审核"
                          : "查看"}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
