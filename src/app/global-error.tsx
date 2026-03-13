"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8E1] p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-[#4E342E] mb-2">
          出现问题
        </h2>

        <p className="text-gray-600 mb-6">
          抱歉，发生了意外错误。请稍后重试，或联系客服获取帮助。
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-gray-500 font-mono break-all">
              {error.message || "Unknown error"}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-400 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => window.location.href = "/"}
            variant="outline"
          >
            返回首页
          </Button>
          <Button
            onClick={reset}
            className="bg-[#FDD835] hover:bg-[#FDD835]/90 text-[#4E342E]"
          >
            重试
          </Button>
        </div>
      </div>
    </div>
  );
}
