"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

interface RechargeFormProps {
  customerId: string;
  currentBalance: number;
}

export function RechargeForm({ customerId, currentBalance }: RechargeFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const points = parseInt(amount);
    if (!points || points <= 0) {
      setError("请输入有效的点数");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/credits/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: customerId,
          amount: points,
          description: description || `管理员充值 ${points} 点数`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "充值失败");
      }

      router.refresh();
      setAmount("");
      setDescription("");
      alert(`充值成功！当前余额: ${currentBalance + points}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "充值失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
      )}

      <div>
        <label className="text-sm text-gray-600">充值点数</label>
        <Input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="输入点数数量"
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-sm text-gray-600">备注 (可选)</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="备注说明"
          className="mt-1"
        />
      </div>

      <Button
        type="submit"
        disabled={loading || !amount}
        className="w-full bg-[#FDD835] text-[#4E342E] hover:bg-[#FDD835]/90"
      >
        {loading ? "充值中..." : "确认充值"}
      </Button>
    </form>
  );
}
