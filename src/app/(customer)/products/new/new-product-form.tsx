"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StyleTemplate {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
}

interface NewProductFormProps {
  categories: { value: string; label: string }[];
  styleTemplates: StyleTemplate[];
  availableCredits: number;
}

export function NewProductForm({
  categories,
  styleTemplates,
  availableCredits,
}: NewProductFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    category: "clothing",
    shootingRequirements: "",
    stylePreference: styleTemplates[0]?.id || "",
    specialNotes: "",
    deliveryCount: 6,
  });

  const [sourceImages, setSourceImages] = useState<
    { id: string; url: string; file: File }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      const invalidFiles = files.filter((f) => !validTypes.includes(f.type));
      if (invalidFiles.length > 0) {
        setError("仅支持 JPG、PNG、WEBP 格式");
        return;
      }

      setUploading(true);
      setError("");

      try {
        const imageData = await Promise.all(
          files.map(async (file) => {
            // Use server-side upload
            const formData = new FormData();
            formData.append("file", file);
            formData.append("type", "source");

            const res = await fetch("/api/upload/server", {
              method: "POST",
              body: formData,
            });

            if (!res.ok) {
              const errorText = await res.text();
              console.error("Upload failed:", res.status, errorText);
              throw new Error(`Upload failed: ${res.status}`);
            }

            const data = await res.json();

            return {
              id: crypto.randomUUID(),
              url: data.publicUrl,
              file,
            };
          })
        );

        setSourceImages((prev) => [...prev, ...imageData]);
      } catch (err) {
        setError("图片上传失败，请重试");
        console.error(err);
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const removeImage = (id: string) => {
    setSourceImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.shootingRequirements) {
      setError("请填写产品名称和拍摄需求");
      return;
    }

    if (sourceImages.length === 0) {
      setError("请至少上传一张产品图片");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          deliveryCount: parseInt(String(formData.deliveryCount)),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "创建产品失败");
      }

      const { product } = await res.json();

      await Promise.all(
        sourceImages.map((img, index) =>
          fetch("/api/products/images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: product.id,
              url: img.url,
              fileName: img.file.name,
              fileSize: img.file.size,
              mimeType: img.file.type,
              sortOrder: index,
            }),
          })
        )
      );

      router.push(`/products/${product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建产品失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h2 className="text-base font-semibold text-[#4E342E]">产品信息</h2>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="name" className="text-sm">产品名称 *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="例如：春季新款连衣裙"
              required
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label htmlFor="category" className="text-sm">产品类目 *</Label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="mt-1 w-full h-9 px-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FDD835] text-sm"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="shootingRequirements" className="text-sm">拍摄需求 *</Label>
          <textarea
            id="shootingRequirements"
            name="shootingRequirements"
            value={formData.shootingRequirements}
            onChange={handleChange}
            placeholder="请描述产品特点、想要的场景、风格、角度等。例如：春夏季节款连衣裙，田园风格，浅色背景，自然光线，侧身展示"
            rows={3}
            required
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FDD835] text-sm"
          />
        </div>

        <div>
          <Label htmlFor="specialNotes" className="text-sm">特别说明</Label>
          <textarea
            id="specialNotes"
            name="specialNotes"
            value={formData.specialNotes}
            onChange={handleChange}
            placeholder="如有特殊要求请注明（选填）"
            rows={2}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FDD835] text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#4E342E]">产品图片</h2>
          <span className="text-xs text-gray-500">至少1张</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {sourceImages.map((img) => (
            <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img
                src={img.url}
                alt="Product"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 text-white rounded-full text-xs hover:bg-black/70"
              >
                ×
              </button>
            </div>
          ))}

          <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#FDD835] transition-colors">
            <span className="text-2xl text-gray-400">+</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
        {uploading && <p className="text-xs text-gray-500">上传中...</p>}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#4E342E]">选择风格</h2>
          <div className="flex items-center gap-2 text-xs">
            <Label htmlFor="deliveryCount" className="text-gray-500">交付数量</Label>
            <Input
              id="deliveryCount"
              name="deliveryCount"
              type="number"
              min={1}
              max={20}
              value={formData.deliveryCount}
              onChange={handleChange}
              className="w-14 h-7 text-center text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {styleTemplates.map((style) => (
            <label
              key={style.id}
              className={`relative rounded-lg border-2 cursor-pointer overflow-hidden transition-all ${
                formData.stylePreference === style.id
                  ? "border-[#FDD335] ring-2 ring-[#FDD335]/30"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="stylePreference"
                value={style.id}
                checked={formData.stylePreference === style.id}
                onChange={handleChange}
                className="sr-only"
              />
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                {style.thumbnailUrl ? (
                  <img src={style.thumbnailUrl} alt={style.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">🎨</span>
                )}
              </div>
              <div className="p-1.5 bg-white">
                <p className="font-medium text-xs text-[#4E342E] truncate">{style.name}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
        <div>
          <p className="text-xs text-gray-500">消耗点数</p>
          <p className="text-base font-semibold text-[#4E342E]">1 点</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">可用点数</p>
          <p className="text-base font-semibold text-[#4E342E]">{availableCredits} 点</p>
        </div>
      </div>

      <Button
        type="submit"
        disabled={submitting || uploading}
        className="w-full py-2.5 bg-[#FDD835] text-[#4E342E] font-semibold rounded-lg hover:bg-[#FDD835]/90 disabled:opacity-50 text-sm"
      >
        {submitting ? "创建中..." : "创建产品"}
      </Button>
    </form>
  );
}
