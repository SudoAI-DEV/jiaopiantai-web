import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { BrandLogo } from "@/components/shared/brand-logo";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8E1]">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex">
            <BrandLogo
              size={52}
              className="justify-center gap-3"
              wordmarkClassName="text-3xl font-bold text-[#4E342E]"
            />
          </Link>
          <p className="text-[#4E342E]/70 mt-2">登录您的账号</p>
        </div>
        <Suspense fallback={<div className="text-center py-8">加载中...</div>}>
          <LoginForm />
        </Suspense>
        <p className="text-center mt-6 text-[#4E342E]/70">
          还没有账号？{" "}
          <Link href="/register" className="text-[#FDD835] font-medium hover:underline">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
