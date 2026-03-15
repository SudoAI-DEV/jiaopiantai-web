"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useImageZoom } from "./use-image-zoom";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  Check,
  Ban,
  RotateCcw,
} from "lucide-react";

export const REJECTION_REASONS = [
  { id: "crop_issue", label: "裁切问题" },
  { id: "unnatural_model", label: "模特不自然" },
  { id: "texture_mismatch", label: "纹路偏差" },
  { id: "color_deviation", label: "颜色偏差" },
  { id: "bad_background", label: "背景不合适" },
  { id: "distortion", label: "变形/畸变" },
  { id: "low_resolution", label: "分辨率低" },
  { id: "unnatural_lighting", label: "光影不自然" },
  { id: "wrong_pose", label: "姿势不当" },
  { id: "accessory_error", label: "配饰错误" },
  { id: "fabric_error", label: "面料质感错误" },
  { id: "detail_missing", label: "细节丢失（纽扣/拉链/口袋等）" },
  { id: "proportion_issue", label: "比例失调" },
  { id: "watermark_artifact", label: "水印/伪影" },
] as const;

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

interface ImageReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatedImages: GeneratedImage[];
  sourceImages: SourceImage[];
  initialIndex: number;
  onReview: (imageId: string, status: string, rejectionReason?: { presets: string[]; custom: string }) => Promise<void>;
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

export function ImageReviewModal({
  open,
  onOpenChange,
  generatedImages,
  sourceImages,
  initialIndex,
  onReview,
}: ImageReviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showRejectPanel, setShowRejectPanel] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set());
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const customInputRef = useRef<HTMLTextAreaElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const mainZoom = useImageZoom();
  const sourceZoom = useImageZoom();

  const currentImage = generatedImages[currentIndex];
  const pendingCount = generatedImages.filter((img) => img.reviewStatus === "pending").length;
  const isPending = currentImage?.reviewStatus === "pending";

  // Reset state when modal opens or image changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setShowRejectPanel(false);
    setSelectedReasons(new Set());
    setCustomReason("");
    setAllDone(false);
  }, [initialIndex, open]);

  useEffect(() => {
    mainZoom.reset();
    setShowRejectPanel(false);
    setSelectedReasons(new Set());
    setCustomReason("");
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < generatedImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, generatedImages.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const goToNextPending = useCallback(() => {
    // Find next pending image after current
    for (let i = currentIndex + 1; i < generatedImages.length; i++) {
      if (generatedImages[i].reviewStatus === "pending") {
        setCurrentIndex(i);
        return true;
      }
    }
    // Wrap around to start
    for (let i = 0; i < currentIndex; i++) {
      if (generatedImages[i].reviewStatus === "pending") {
        setCurrentIndex(i);
        return true;
      }
    }
    return false;
  }, [currentIndex, generatedImages]);

  const handleApprove = useCallback(async () => {
    if (!currentImage || loading || !isPending) return;
    setLoading(true);
    try {
      await onReview(currentImage.id, "approved");
      // Check if there are more pending
      const remainingPending = generatedImages.filter(
        (img) => img.reviewStatus === "pending" && img.id !== currentImage.id
      ).length;
      if (remainingPending === 0) {
        setAllDone(true);
        setTimeout(() => onOpenChange(false), 2000);
      } else {
        goToNextPending();
      }
    } finally {
      setLoading(false);
    }
  }, [currentImage, loading, isPending, onReview, generatedImages, goToNextPending, onOpenChange]);

  const handleRegenerate = useCallback(async () => {
    if (!currentImage || loading || !isPending) return;
    setLoading(true);
    try {
      await onReview(currentImage.id, "regenerate");
      const remainingPending = generatedImages.filter(
        (img) => img.reviewStatus === "pending" && img.id !== currentImage.id
      ).length;
      if (remainingPending === 0) {
        setAllDone(true);
        setTimeout(() => onOpenChange(false), 2000);
      } else {
        goToNextPending();
      }
    } finally {
      setLoading(false);
    }
  }, [currentImage, loading, isPending, onReview, generatedImages, goToNextPending, onOpenChange]);

  const handleReject = useCallback(async () => {
    if (!currentImage || loading) return;
    if (selectedReasons.size === 0 && !customReason.trim()) return;

    setLoading(true);
    try {
      await onReview(currentImage.id, "rejected", {
        presets: Array.from(selectedReasons),
        custom: customReason.trim(),
      });
      const remainingPending = generatedImages.filter(
        (img) => img.reviewStatus === "pending" && img.id !== currentImage.id
      ).length;
      if (remainingPending === 0) {
        setAllDone(true);
        setTimeout(() => onOpenChange(false), 2000);
      } else {
        goToNextPending();
      }
    } finally {
      setLoading(false);
    }
  }, [currentImage, loading, selectedReasons, customReason, onReview, generatedImages, goToNextPending, onOpenChange]);

  const toggleReason = (id: string) => {
    setSelectedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canReject = selectedReasons.size > 0 || customReason.trim().length > 0;

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      // Don't handle shortcuts when input is focused (except navigation/zoom)
      if (isInputFocused) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowRejectPanel(false);
          customInputRef.current?.blur();
        }
        return;
      }

      switch (e.key) {
        case "a":
        case "A":
        case "Enter":
          if (!showRejectPanel) {
            e.preventDefault();
            handleApprove();
          }
          break;
        case "r":
        case "R":
          if (!showRejectPanel) {
            e.preventDefault();
            setShowRejectPanel(true);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          goToPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          goToNext();
          break;
        case "+":
        case "=":
          e.preventDefault();
          mainZoom.zoomIn();
          break;
        case "-":
          e.preventDefault();
          mainZoom.zoomOut();
          break;
        case "0":
          e.preventDefault();
          mainZoom.reset();
          break;
        case "Escape":
          if (showRejectPanel) {
            e.preventDefault();
            e.stopPropagation();
            setShowRejectPanel(false);
          }
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, isInputFocused, showRejectPanel, handleApprove, goToPrev, goToNext, mainZoom]);

  if (!currentImage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 flex flex-col overflow-hidden bg-gray-950 border-gray-800"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (showRejectPanel) {
            e.preventDefault();
            setShowRejectPanel(false);
          }
        }}
      >
        <VisuallyHidden>
          <DialogTitle>图片审核</DialogTitle>
        </VisuallyHidden>

        {/* All-done overlay */}
        {allDone && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <p className="text-2xl font-bold text-white">所有图片审核完成</p>
              <p className="text-gray-400 mt-2">即将关闭...</p>
            </div>
          </div>
        )}

        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm text-gray-300">
              <span className="text-white font-medium">{currentIndex + 1}</span>
              <span className="mx-1">/</span>
              <span>{generatedImages.length}</span>
              <span className="ml-3 text-yellow-400">
                {pendingCount} 张待审核
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              disabled={currentIndex === generatedImages.length - 1}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Status + Batch */}
          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${reviewStatusColors[currentImage.reviewStatus]}`}
            >
              {reviewStatusLabels[currentImage.reviewStatus]}
            </span>
            <span className="text-xs text-gray-500">
              第 {currentImage.batchNumber} 批
            </span>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => mainZoom.zoomTo(1)}
              className="text-gray-400 hover:text-white hover:bg-gray-800 text-xs h-7 px-2"
            >
              <Maximize className="h-3.5 w-3.5 mr-1" />
              适应
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => mainZoom.zoomTo(1)}
              className="text-gray-400 hover:text-white hover:bg-gray-800 text-xs h-7 px-2"
            >
              100%
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => mainZoom.zoomTo(2)}
              className="text-gray-400 hover:text-white hover:bg-gray-800 text-xs h-7 px-2"
            >
              200%
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={mainZoom.zoomOut}
              className="text-gray-400 hover:text-white hover:bg-gray-800 h-7 w-7"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-gray-400 min-w-[3ch] text-center">
              {Math.round(mainZoom.scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={mainZoom.zoomIn}
              className="text-gray-400 hover:text-white hover:bg-gray-800 h-7 w-7"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-5 bg-gray-700 mx-2" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-white hover:bg-gray-800 h-7 w-7"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content: Left-Right Split */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 flex">
            {/* Left: Generated Image */}
            <div
              ref={mainZoom.containerRef}
              className="flex-1 min-w-0 overflow-hidden flex items-center justify-center bg-gray-950 select-none"
              onWheel={mainZoom.handleWheel}
              onMouseDown={mainZoom.handleMouseDown}
              onMouseMove={mainZoom.handleMouseMove}
              onMouseUp={mainZoom.handleMouseUp}
              onDoubleClick={mainZoom.handleDoubleClick}
            >
              <img
                key={currentImage.id}
                src={currentImage.url}
                alt="审核图片"
                className="max-w-full max-h-full object-contain"
                style={mainZoom.style}
                draggable={false}
              />
            </div>

            {/* Right: Source Images Panel */}
            {sourceImages.length > 0 && (
              <div className="w-[280px] shrink-0 bg-gray-900 border-l border-gray-800 flex flex-col">
                <div className="px-3 py-2 border-b border-gray-800">
                  <span className="text-xs font-medium text-gray-400">
                    原图参考 ({sourceImages.length})
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {sourceImages.map((src) => (
                    <button
                      key={src.id}
                      onClick={() => setSourcePreviewUrl(src.url)}
                      className="w-full rounded-lg overflow-hidden border border-gray-700 hover:border-yellow-500 transition-colors group/src"
                    >
                      <img
                        src={src.url}
                        alt={src.fileName || "原图"}
                        className="w-full object-contain bg-gray-800"
                      />
                      <div className="px-2 py-1 bg-gray-800 text-[10px] text-gray-500 group-hover/src:text-yellow-400 truncate text-center">
                        点击放大查看
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Panel */}
          <div className="shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-3">
            {showRejectPanel ? (
              /* Rejection Reason Panel */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">选择驳回理由</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRejectPanel(false)}
                    className="text-gray-400 hover:text-white h-7 text-xs"
                  >
                    取消
                  </Button>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {REJECTION_REASONS.map((reason) => (
                    <label
                      key={reason.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        selectedReasons.has(reason.id)
                          ? "bg-red-900/50 border border-red-500 text-red-200"
                          : "bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      <Checkbox
                        checked={selectedReasons.has(reason.id)}
                        onCheckedChange={() => toggleReason(reason.id)}
                        className="border-gray-500 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 h-3.5 w-3.5"
                      />
                      <span className="leading-tight">{reason.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3 items-end">
                  <textarea
                    ref={customInputRef}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    placeholder="自定义驳回理由（可选）..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none h-10"
                  />
                  <Button
                    onClick={handleReject}
                    disabled={!canReject || loading}
                    className="bg-red-600 hover:bg-red-700 text-white h-10 px-6"
                  >
                    {loading ? "处理中..." : "确认驳回"}
                  </Button>
                </div>
                {!canReject && (
                  <p className="text-xs text-red-400">请选择或填写驳回理由</p>
                )}
              </div>
            ) : (
              /* Normal Action Buttons */
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPending ? (
                    <>
                      <Button
                        onClick={handleApprove}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                      >
                        <Check className="h-4 w-4" />
                        {loading ? "处理中..." : "通过"}
                        <kbd className="ml-1 text-[10px] opacity-60 bg-green-700 px-1 rounded">A</kbd>
                      </Button>
                      <Button
                        onClick={() => setShowRejectPanel(true)}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                      >
                        <Ban className="h-4 w-4" />
                        驳回
                        <kbd className="ml-1 text-[10px] opacity-60 bg-red-700 px-1 rounded">R</kbd>
                      </Button>
                      <Button
                        onClick={handleRegenerate}
                        disabled={loading}
                        variant="outline"
                        className="border-orange-600 text-orange-400 hover:bg-orange-600/20 gap-1.5"
                      >
                        <RotateCcw className="h-4 w-4" />
                        重新生成
                      </Button>
                    </>
                  ) : (
                    <span
                      className={`px-3 py-1.5 rounded-full text-sm font-medium ${reviewStatusColors[currentImage.reviewStatus]}`}
                    >
                      {reviewStatusLabels[currentImage.reviewStatus]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>← → 切换图片</span>
                  <span>滚轮/+/- 缩放</span>
                  <span>双击放大</span>
                  <span>Esc 关闭</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Source Image Preview Overlay */}
        {sourcePreviewUrl && (
          <div
            className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center"
            onClick={() => {
              setSourcePreviewUrl(null);
              sourceZoom.reset();
            }}
          >
            <div
              className="max-w-[90%] max-h-[90%] relative"
              onClick={(e) => e.stopPropagation()}
              onWheel={sourceZoom.handleWheel}
              onMouseDown={sourceZoom.handleMouseDown}
              onMouseMove={sourceZoom.handleMouseMove}
              onMouseUp={sourceZoom.handleMouseUp}
              onDoubleClick={sourceZoom.handleDoubleClick}
            >
              <img
                src={sourcePreviewUrl}
                alt="原图预览"
                className="max-w-full max-h-[85vh] object-contain"
                style={sourceZoom.style}
                draggable={false}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSourcePreviewUrl(null);
                sourceZoom.reset();
              }}
              className="absolute top-4 right-4 text-white hover:bg-white/20 h-10 w-10"
            >
              <X className="h-6 w-6" />
            </Button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <span className="text-xs text-gray-400 bg-black/60 px-3 py-1 rounded-full">
                原图预览 · 滚轮缩放 · 双击放大 · 点击空白处关闭
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
