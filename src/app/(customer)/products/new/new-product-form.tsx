"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

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
    category: "",
    description: "",
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

      // Validate files
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      const invalidFiles = files.filter((f) => !validTypes.includes(f.type));
      if (invalidFiles.length > 0) {
        setError("仅支持 JPG、PNG、WEBP 格式");
        return;
      }

      setUploading(true);
      setError("");

      try {
        // Get presigned URLs for each file
        const imageData = await Promise.all(
          files.map(async (file) => {
            const res = await fetch("/api/upload/presigned-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: file.name,
                fileType: file.type,
              }),
            });

            if (!res.ok) throw new Error("Failed to get upload URL");

            const { uploadUrl, publicUrl } = await res.json();

            // Upload to OSS
            const uploadRes = await fetch(uploadUrl, {
              method: "PUT",
              body: file,
              headers: { "Content-Type": file.type },
            });
            
            if (!uploadRes.ok) {
              const errorText = await uploadRes.text();
              console.error("Upload failed:", uploadRes.status, errorText);
              throw new Error(`Upload failed: ${uploadRes.status} - ${errorText}`);
            }

            return {
              id: crypto.randomUUID(),
              url: publicUrl,
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

    if (!formData.name || !formData.category || !formData.shootingRequirements) {
      setError("请填写所有必填字段");
      return;
    }

    if (sourceImages.length === 0) {
      setError("请至少上传一张产品图片");
      return;
    }

    setSubmitting(true);

    try {
      // Create product
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

      // Upload source images metadata
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-[#4E342E]">基本信息</h2>

        <div>
          <Label htmlFor="name">产品名称 *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="例如：2024春季新款连衣裙"
            required
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">产品类目 *</Label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FDD835]"
            >
              <option value="">请选择类目</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="deliveryCount">期望交付数量</Label>
            <Input
              id="deliveryCount"
              name="deliveryCount"
              type="number"
              min={1}
              max={20}
              value={formData.deliveryCount}
              onChange={handleChange}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">产品描述</Label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="补充产品特点、材质等信息（选填）"
            rows={3}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FDD835]"
          />
        </div>
      </div>

      {/* Source Images */}
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-[#4E342E]">产品图片</h2>
        <p className="text-sm text-gray-500">
          上传产品原图，AI 将基于这些图片生成商品图
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sourceImages.map((img) => (
            <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img
                src={img.url}
                alt="Product image"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full text-sm hover:bg-black/70"
              >
                ×
              </button>
            </div>
          ))}

          <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#FDD835] transition-colors">
            <span className="text-3xl text-gray-400">+</span>
            <span className="text-sm text-gray-500 mt-1">上传图片</span>
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

        {uploading && (
          <p className="text-sm text-gray-500">上传中...</p>
        )}
      </div>

      {/* Requirements */}
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-[#4E342E]">拍摄需求</h2>

        <div>
          <Label htmlFor="shootingRequirements">详细需求 *</Label>
          <textarea
            id="shootingRequirements"
            name="shootingRequirements"
            value={formData.shootingRequirements}
            onChange={handleChange}
            placeholder="请详细描述您的拍摄需求，如：场景、角度、光线、背景等"
            rows={4}
            required
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FDD835]"
          />
        </div>

        <div>
          <Label>选择风格</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
            {styleTemplates.map((style) => (
              <label
                key={style.id}
                className={`relative rounded-lg border-2 cursor-pointer overflow-hidden transition-colors ${
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
                    <img
                      src={style.thumbnailUrl}
                      alt={style.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">🎨</span>
                  )}
                </div>
                <div className="p-2 bg-white">
                  <p className="font-medium text-sm text-[#4E342E]">
                    {style.name}
                  </p>
                  {style.description && (
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {style.description}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="specialNotes">特别注意事项</Label>
          <textarea
            id="specialNotes"
            name="specialNotes"
            value={formData.specialNotes}
            onChange={handleChange}
            placeholder="任何需要特别注意的事项（选填）"
            rows={2}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FDD835]"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
        <div>
          <p className="text-sm text-gray-600">消耗点数</p>
          <p className="text-lg font-semibold text-[#4E342E]">1 点</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">可用点数</p>
          <p className="text-lg font-semibold text-[#4E342E]">
            {availableCredits} 点
          </p>
        </div>
      </div>

      <Button
        type="submit"
        disabled={submitting || uploading}
        className="w-full py-3 bg-[#FDD835] text-[#4E342E] font-semibold rounded-lg hover:bg-[#FDD835]/90 disabled:opacity-50"
      >
        {submitting ? "创建中..." : "创建产品"}
      </Button>
    </form>
  );
}
