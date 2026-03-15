"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { ImageReviewModal } from "@/components/review/image-review-modal";

interface GeneratedImage {
  id: string;
  url: string;
  batchNumber: number;
  reviewStatus: string;
}

interface SourceImage {
  id: string;
  url: string;
  fileName?: string | null;
}

interface ReviewClientProps {
  productId: string;
  generatedImages: GeneratedImage[];
  sourceImages: SourceImage[];
  productStatus: string;
  deliveryCount: number;
  approvedCount: number;
}

const reviewStatusLabels: Record<string, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已淘汰",
  regenerate: "需重新生成",
};

const reviewStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  regenerate: "bg-orange-100 text-orange-700",
};

export function ReviewClient({
  generatedImages: initialImages,
  sourceImages,
  productStatus,
  deliveryCount,
}: ReviewClientProps) {
  const [images, setImages] = useState(initialImages);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialIndex, setModalInitialIndex] = useState(0);

  const isEditable = ["submitted", "queued", "processing", "reviewing"].includes(productStatus);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map((img) => img.id)));
    }
  };

  const handleReview = async (imageId: string, status: string) => {
    setLoading(imageId);
    setActionType(status);

    try {
      const res = await fetch(`/api/admin/images/${imageId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error("审核失败");
      }

      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, reviewStatus: status } : img
        )
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    } catch (err) {
      alert("操作失败，请重试");
    } finally {
      setLoading(null);
      setActionType(null);
    }
  };

  const handleBatchAction = async (status: string) => {
    let targetImages = images.filter((img) => img.reviewStatus === "pending");

    // If specific images are selected, only batch operate on those
    if (selectedIds.size > 0) {
      targetImages = images.filter(
        (img) => selectedIds.has(img.id) && img.reviewStatus === "pending"
      );
    }

    if (targetImages.length === 0) return;

    const label = selectedIds.size > 0 ? `选中的 ${targetImages.length} 张` : `全部 ${targetImages.length} 张待审核`;
    if (!confirm(`确定要将 ${label} 图片标记为 "${reviewStatusLabels[status]}" 吗？`)) {
      return;
    }

    setActionType("batch");
    setLoading("batch");

    try {
      await Promise.all(
        targetImages.map((img) =>
          fetch(`/api/admin/images/${img.id}/review`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );

      setImages((prev) =>
        prev.map((img) =>
          targetImages.find((t) => t.id === img.id)
            ? { ...img, reviewStatus: status }
            : img
        )
      );
      setSelectedIds(new Set());
    } catch (err) {
      alert("批量操作失败，请重试");
    } finally {
      setLoading(null);
      setActionType(null);
    }
  };

  const openImageModal = (index: number) => {
    setModalInitialIndex(index);
    setModalOpen(true);
  };

  const handleModalReview = async (
    imageId: string,
    status: string,
    rejectionReason?: { presets: string[]; custom: string }
  ) => {
    const res = await fetch(`/api/admin/images/${imageId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejectionReason }),
    });
    if (!res.ok) throw new Error("审核失败");
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, reviewStatus: status } : img
      )
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(imageId);
      return next;
    });
  };

  const pendingImages = images.filter((img) => img.reviewStatus === "pending");
  const approvedImages = images.filter((img) => img.reviewStatus === "approved");
  const rejectedImages = images.filter((img) => img.reviewStatus === "rejected");
  const regenerateImages = images.filter((img) => img.reviewStatus === "regenerate");
  const canDeliver = approvedImages.length >= deliveryCount;
  const selectedCount = selectedIds.size;
  const hasPendingSelected = selectedCount > 0 && images.some(
    (img) => selectedIds.has(img.id) && img.reviewStatus === "pending"
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-500">待审核</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingImages.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-500">已通过</p>
          <p className="text-2xl font-bold text-green-600">{approvedImages.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-500">已淘汰</p>
          <p className="text-2xl font-bold text-red-600">{rejectedImages.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-500">需重新生成</p>
          <p className="text-2xl font-bold text-orange-600">{regenerateImages.length}</p>
        </div>
      </div>

      {/* Selection Info */}
      {isEditable && images.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === images.length && images.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-[#FDD835] focus:ring-[#FDD835]"
              />
              <span className="text-sm text-gray-600">
                全选 ({images.length} 张)
              </span>
            </label>
            {selectedCount > 0 && (
              <span className="text-sm text-blue-600 font-medium">
                已选择 {selectedCount} 张
              </span>
            )}
          </div>
          {selectedCount > 0 && hasPendingSelected && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleBatchAction("approved")}
                disabled={actionType === "batch"}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                批量通过
              </Button>
              <Button
                size="sm"
                onClick={() => handleBatchAction("rejected")}
                disabled={actionType === "batch"}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                批量淘汰
              </Button>
              <Button
                size="sm"
                onClick={() => handleBatchAction("regenerate")}
                disabled={actionType === "batch"}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                批量重制
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
              >
                取消选择
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Images Grid */}
      {images.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🖼️</div>
          <p className="text-gray-500">暂无生成图片</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img, index) => (
            <div
              key={img.id}
              className={`relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 group cursor-pointer ${
                img.reviewStatus === "approved"
                  ? "ring-2 ring-green-500"
                  : img.reviewStatus === "rejected"
                  ? "opacity-60"
                  : ""
              } ${selectedIds.has(img.id) ? "ring-2 ring-[#FDD835]" : ""}`}
              onClick={() => openImageModal(index)}
            >
              <OptimizedImage
                src={img.url}
                alt="Generated"
                fill
                aspectRatio="3/4"
              />

              {/* Selection Checkbox */}
              {isEditable && (
                <div
                  className="absolute top-2 left-2 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(img.id);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(img.id)}
                    onChange={() => {}}
                    className="w-5 h-5 rounded border-2 border-white bg-white/80 checked:bg-[#FDD835] checked:border-[#FDD835] cursor-pointer shadow"
                  />
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    reviewStatusColors[img.reviewStatus]
                  }`}
                >
                  {reviewStatusLabels[img.reviewStatus]}
                </span>
              </div>

              {/* Batch Number */}
              <div className="absolute bottom-2 left-2">
                <span className="px-2 py-1 bg-black/50 text-white text-xs rounded-full">
                  第 {img.batchNumber} 批
                </span>
              </div>

              {/* Actions */}
              {isEditable && img.reviewStatus === "pending" && !selectedIds.has(img.id) && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleReview(img.id, "approved")}
                    disabled={loading === img.id}
                    className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {loading === img.id && actionType === "approved" ? "..." : "✓ 通过"}
                  </button>
                  <button
                    onClick={() => handleReview(img.id, "rejected")}
                    disabled={loading === img.id}
                    className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    {loading === img.id && actionType === "rejected" ? "..." : "✗ 淘汰"}
                  </button>
                  <button
                    onClick={() => handleReview(img.id, "regenerate")}
                    disabled={loading === img.id}
                    className="px-3 py-1.5 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50"
                  >
                    {loading === img.id && actionType === "regenerate" ? "..." : "🔄 重制"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {isEditable && pendingImages.length > 0 && selectedCount === 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-[#4E342E] mb-4">批量操作</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleBatchAction("approved")}
              disabled={actionType === "batch"}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {actionType === "batch" ? "处理中..." : `全部通过 (${pendingImages.length})`}
            </Button>
            <Button
              onClick={() => handleBatchAction("rejected")}
              disabled={actionType === "batch"}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              全部淘汰
            </Button>
            <Button
              onClick={() => handleBatchAction("regenerate")}
              disabled={actionType === "batch"}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              全部重新生成
            </Button>
          </div>
        </div>
      )}

      {/* Deliver Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[#4E342E]">
              {canDeliver ? (
                <span className="text-green-600">✓ 已达到交付标准</span>
              ) : (
                <span>还需 {deliveryCount - approvedImages.length} 张通过</span>
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              期望交付 {deliveryCount} 张，当前通过 {approvedImages.length} 张
            </p>
          </div>
        </div>
      </div>

      {/* Image Review Modal */}
      <ImageReviewModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        generatedImages={images}
        sourceImages={sourceImages}
        initialIndex={modalInitialIndex}
        onReview={handleModalReview}
      />
    </div>
  );
}
