"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CATEGORIES = [
  { value: "clothing", label: "服装" },
  { value: "accessories", label: "饰品" },
  { value: "shoes", label: "鞋类" },
  { value: "bags", label: "箱包" },
  { value: "electronics", label: "电子产品" },
  { value: "home", label: "家居用品" },
  { value: "beauty", label: "美妆护肤" },
  { value: "food", label: "食品饮料" },
  { value: "other", label: "其他" },
];

export function RegisterForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    confirmPassword: "",
    name: "",
    shopName: "",
    category: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (formData.password.length < 6) {
      setError("密码长度至少为 6 位");
      return;
    }

    if (!formData.phone || formData.phone.length < 8) {
      setError("请输入有效的手机号");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/sign-up/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: formData.phone,
          password: formData.password,
          name: formData.name,
          shopName: formData.shopName,
          category: formData.category,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "注册失败");
        return;
      }

      // Auto login after registration
      const loginRes = await fetch("/api/auth/sign-in/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: formData.phone,
          password: formData.password,
        }),
      });

      if (loginRes.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.push("/login");
      }
    } catch (err) {
      setError("注册时发生错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor="phone">手机号 *</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          placeholder="请输入手机号"
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="password">密码 *</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="至少 6 位"
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="confirmPassword">确认密码 *</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="再次输入密码"
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="name">您的姓名 *</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="请输入您的姓名"
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="shopName">店铺名称</Label>
        <Input
          id="shopName"
          name="shopName"
          value={formData.shopName}
          onChange={handleChange}
          placeholder="请输入店铺名称"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="category">主营类目</Label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FDD835] focus:border-transparent"
        >
          <option value="">请选择类目</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-[#FDD835] text-[#4E342E] hover:bg-[#FDD835]/90"
      >
        {loading ? "注册中..." : "注册"}
      </Button>
    </form>
  );
}
