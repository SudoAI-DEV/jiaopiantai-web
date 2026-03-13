import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8E1]">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-[#4E342E]">
            蕉片台
          </Link>
          <p className="text-[#4E342E]/70 mt-2">创建您的账号</p>
        </div>
        <RegisterForm />
        <p className="text-center mt-6 text-[#4E342E]/70">
          已有账号？{" "}
          <Link href="/login" className="text-[#FDD835] font-medium hover:underline">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
