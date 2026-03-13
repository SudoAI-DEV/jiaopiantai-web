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
  const [action, setAction] = useState<"deliver" | null>(null);

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

  return (
    <Button
      onClick={handleDeliver}
      disabled={loading}
      className="bg-green-500 hover:bg-green-600 text-white"
    >
      {loading ? "处理中..." : `确认交付 (${approvedCount}/${deliveryCount})`}
    </Button>
  );
}
