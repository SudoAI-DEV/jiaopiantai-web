import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8E1] p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-20 h-20 bg-[#FDD835]/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🔍</span>
        </div>

        <h1 className="text-3xl font-bold text-[#4E342E] mb-2">
          404
        </h1>

        <h2 className="text-xl text-[#4E342E] mb-4">
          页面未找到
        </h2>

        <p className="text-gray-600 mb-8">
          您访问的页面不存在或已被移除。
        </p>

        <div className="flex gap-4 justify-center">
          <Button
            asChild
            variant="outline"
          >
            <Link href="/">返回首页</Link>
          </Button>
          <Button
            asChild
            className="bg-[#FDD835] hover:bg-[#FDD835]/90 text-[#4E342E]"
          >
            <Link href="/dashboard">前往控制台</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
