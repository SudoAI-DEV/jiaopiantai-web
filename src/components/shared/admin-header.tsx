"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface AdminHeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

const adminNavItems = [
  { href: "/admin", label: "仪表盘", icon: "📊" },
  { href: "/admin/customers", label: "客户管理", icon: "👥" },
  { href: "/admin/products", label: "产品管理", icon: "📦" },
  { href: "/admin/credits", label: "点数管理", icon: "💰" },
  { href: "/admin/styles", label: "风格模板", icon: "🎨" },
];

export function AdminHeader({ user }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <header className="bg-[#4E342E] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link href="/admin" className="flex items-center">
            <span className="text-xl sm:text-2xl font-bold text-[#FDD835]">蕉片台</span>
            <span className="ml-2 px-2 py-0.5 bg-[#FDD835]/20 text-[#FDD835] text-xs rounded hidden sm:block">
              管理后台
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#FDD835] text-[#4E342E]"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <span className="text-sm text-white/80">
                {user.name || user.email}
              </span>
            )}
            <Link
              href="/dashboard"
              className="text-sm text-white/80 hover:text-white"
            >
              切换到客户版
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-white/80 hover:text-white"
            >
              退出登录
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white"
            aria-label="菜单"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 py-3 space-y-2">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#FDD835] text-[#4E342E]"
                      : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-white/10 space-y-2">
              {user && (
                <div className="px-3 py-2 text-sm text-white/60">
                  {user.name || user.email}
                </div>
              )}
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded-lg"
              >
                切换到客户版
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded-lg"
              >
                退出登录
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
