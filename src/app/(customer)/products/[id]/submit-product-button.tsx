"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface SubmitProductButtonProps {
  productId: string;
}

export function SubmitProductButton({
  productId,
}: SubmitProductButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/products/${productId}/submit`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "提交失败");
      }

      setSuccessMessage("已提交，正在刷新任务状态。");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "提交失败，请稍后重试。"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isBusy = isSubmitting || isRefreshing;

  return (
    <div className="w-full sm:w-auto">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          onClick={handleSubmit}
          className="rounded-lg bg-[#FDD835] text-[#4E342E] hover:bg-[#FDD835]/90"
          disabled={isBusy}
        >
          {isBusy ? "提交中..." : "提交审核"}
        </Button>
      </div>

      {errorMessage && (
        <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
      )}
      {successMessage && (
        <p className="mt-3 text-sm text-emerald-700">{successMessage}</p>
      )}
    </div>
  );
}
