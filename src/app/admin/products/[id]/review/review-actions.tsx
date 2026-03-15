"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ReviewActionsProps {
  productId: string;
  productStatus: string;
  approvedCount: number;
  deliveryCount: number;
}

export function ReviewActions({
  productId,
  productStatus,
  approvedCount,
  deliveryCount,
}: ReviewActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"complete" | "deliver" | null>(null);

  const handleCompleteReview = async () => {
    if (!confirm("确定完成审核？完成后客户将可以看到审核通过的图片")) return;

    setLoading(true);
    setAction("complete");

    try {
      const res = await fetch(`/api/admin/products/${productId}/complete-review`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "完成审核失败");
      }

      router.refresh();
      alert("审核完成！已通知客户查看");
    } catch (err) {
      alert(err instanceof Error ? err.message : "完成审核失败");
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleDeliver = async () => {
    if (!confirm(`确认交付 ${approvedCount} 张图片给客户？`)) return;

    setLoading(true);
    setAction("deliver");

    try {
      const res = await fetch(`/api/admin/products/${productId}/deliver`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "交付失败");
      }

      router.refresh();
      alert("交付成功！");
    } catch (err) {
      alert(err instanceof Error ? err.message : "交付失败");
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const isReviewing = productStatus === "reviewing";
  const isClientReviewing = productStatus === "client_reviewing";

  return (
    <div className="flex gap-2">
      {isReviewing && approvedCount > 0 && (
        <Button
          onClick={handleCompleteReview}
          disabled={loading}
          className="bg-[#FDD835] hover:bg-[#fbc02d] text-[#4E342E]"
        >
          {loading && action === "complete" ? "处理中..." : "完成审核"}
        </Button>
      )}
      
      {(isClientReviewing || (isReviewing && approvedCount >= deliveryCount)) && (
        <Button
          onClick={handleDeliver}
          disabled={loading}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          {loading && action === "deliver" ? "处理中..." : `确认交付 (${approvedCount}/${deliveryCount})`}
        </Button>
      )}
    </div>
  );
}
