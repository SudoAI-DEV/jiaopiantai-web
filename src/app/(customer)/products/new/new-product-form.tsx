"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Scene } from "@/lib/scenes";

interface NewProductFormProps {
  categories: { value: string; label: string }[];
  sceneTemplates: Scene[];
  availableCredits: number;
}

export function NewProductForm({
  categories,
  sceneTemplates,
  availableCredits,
}: NewProductFormProps) {
  const router = useRouter();
  const hasSceneTemplates = sceneTemplates.length > 0;

  const [formData, setFormData] = useState({
    name: "",
    category: "clothing",
    shootingRequirements: "",
    stylePreference: sceneTemplates[0]?.id || "",
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
            // Step 1: Get presigned URL
            const res = await fetch("/api/upload/presigned-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: file.name,
                fileType: file.type,
                type: "source",
              }),
            });

            if (!res.ok) throw new Error("Failed to get upload URL");

            const { uploadUrl, publicUrl } = await res.json();

            // Step 2: Upload directly to R2 (browser -> R2)
            const uploadRes = await fetch(uploadUrl, {
              method: "PUT",
              body: file,
              headers: { "Content-Type": file.type },
            });

            if (!uploadRes.ok) {
              const errorText = await uploadRes.text();
              console.error("R2 upload failed:", uploadRes.status, errorText);
              throw new Error(`Upload failed: ${uploadRes.status}`);
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

    if (!formData.name) {
      setError("请填写产品名称");
      return;
    }

    if (!formData.stylePreference) {
      setError("请选择场景");
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <Label htmlFor="shootingRequirements" className="text-sm">拍摄需求</Label>
          <textarea
            id="shootingRequirements"
            name="shootingRequirements"
            value={formData.shootingRequirements}
            onChange={handleChange}
            placeholder="请描述产品特点、想要的场景氛围、展示角度和光线。例如：春夏连衣裙，轻户外自然光，模特侧身走动，画面干净通透"
            rows={3}
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
          <div>
            <h2 className="text-base font-semibold text-[#4E342E]">选择场景</h2>
            <p className="mt-1 text-xs text-[#8C7A6D]">固定 4 个场景模板，作为本次生成的主要参考。</p>
          </div>
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

        {!hasSceneTemplates ? (
          <div className="rounded-xl border border-dashed border-[#E6DDD1] bg-[#FBF7F1] px-4 py-6 text-sm text-[#8C7A6D]">
            暂无可用场景，请联系管理员先配置场景模板。
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sceneTemplates.map((scene, index) => {
              const isSelected = formData.stylePreference === scene.id;

              return (
                <label
                  key={scene.id}
                  className={`group overflow-hidden rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-[#FDD835] bg-[#FFF9E8] shadow-[0_12px_30px_rgba(253,216,53,0.18)]"
                      : "border-[#E8E1D8] bg-white hover:border-[#D9C7A7] hover:shadow-[0_10px_24px_rgba(78,52,46,0.08)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="stylePreference"
                    value={scene.id}
                    checked={isSelected}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#F6F0E7]">
                    {scene.thumbnailUrl ? (
                      <img
                        src={scene.thumbnailUrl}
                        alt={scene.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-[#B7A898]">
                        场景
                      </div>
                    )}
                    <div className="absolute left-3 top-3 rounded-full bg-white/88 px-2.5 py-1 text-xs font-medium text-[#6E584C] backdrop-blur-sm">
                      场景 {index + 1}
                    </div>
                    {isSelected && (
                      <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#FDD835] text-[#4E342E] text-sm font-bold">
                        ✓
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-sm text-[#4E342E]">
                        {scene.name}
                      </span>
                      <span className={`text-xs ${isSelected ? "text-[#8B6A1C]" : "text-[#9C8B7E]"}`}>
                        {isSelected ? "已选择" : "点击选择"}
                      </span>
                    </div>
                    {scene.description ? (
                      <p className="text-xs leading-5 text-[#8C7A6D]">
                        {scene.description}
                      </p>
                    ) : (
                      <p className="text-xs leading-5 text-[#8C7A6D]">
                        用这个场景作为画面氛围、构图和背景参考。
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
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
        disabled={submitting || uploading || !hasSceneTemplates}
        className="w-full py-2.5 bg-[#FDD835] text-[#4E342E] font-semibold rounded-lg hover:bg-[#FDD835]/90 disabled:opacity-50 text-sm"
      >
        {submitting ? "创建中..." : "创建产品"}
      </Button>
    </form>
  );
}
