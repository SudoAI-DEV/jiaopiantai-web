"use client";

import {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
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
  canApproveImage,
  canRegenerateImage,
  canRejectImage,
  getAdjacentSourceIndex,
  getNextPendingIndex,
  shouldAutoAdvanceAfterReview,
  shouldShowAllDoneAfterReview,
} from "./review-flow";
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
  { id: "wrong_pattern", label: "版型不对" },
  { id: "fake_scene", label: "场景太假" },
  { id: "dark_lighting", label: "光线太暗" },
  { id: "stiff_pose", label: "姿势呆板" },
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
  onReview: (
    imageId: string,
    status: string,
    rejectionReason?: { presets: string[]; custom: string }
  ) => Promise<void>;
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
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [sourcePreviewIndex, setSourcePreviewIndex] = useState<number | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const sourcePreviewContainerRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLTextAreaElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const mainZoom = useImageZoom();
  const sourceZoom = useImageZoom();

  const currentImage = generatedImages[currentIndex];
  const pendingCount = generatedImages.filter((img) => img.reviewStatus === "pending").length;
  const currentSourcePreview =
    sourcePreviewIndex !== null ? sourceImages[sourcePreviewIndex] ?? null : null;
  const canApproveCurrent = currentImage ? canApproveImage(currentImage.reviewStatus) : false;
  const canRejectCurrent = currentImage ? canRejectImage(currentImage.reviewStatus) : false;
  const canRegenerateCurrent = currentImage
    ? canRegenerateImage(currentImage.reviewStatus)
    : false;
  const canSubmitReject = selectedReasons.size > 0 || customReason.trim().length > 0;

  const resetRejectForm = useCallback(() => {
    setSelectedReasons(new Set());
    setCustomReason("");
    setRejectError(null);
    setIsInputFocused(false);
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const focusModal = useCallback(() => {
    window.requestAnimationFrame(() => {
      dialogContentRef.current?.focus();
    });
  }, []);

  const closeRejectPanel = useCallback(() => {
    setShowRejectPanel(false);
    resetRejectForm();
    customInputRef.current?.blur();
    focusModal();
  }, [focusModal, resetRejectForm]);

  const openRejectPanel = useCallback(() => {
    if (!currentImage || !canRejectImage(currentImage.reviewStatus)) {
      return;
    }

    resetRejectForm();
    setShowRejectPanel(true);
  }, [currentImage, resetRejectForm]);

  const closeSourcePreview = useCallback(() => {
    setSourcePreviewIndex(null);
    focusModal();
  }, [focusModal]);

  const openSourcePreview = useCallback(
    (index: number) => {
      if (index < 0 || index >= sourceImages.length) {
        return;
      }

      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement) {
        activeElement.blur();
      }

      setSourcePreviewIndex(index);
    },
    [sourceImages.length]
  );

  const goToAdjacentSource = useCallback(
    (direction: "prev" | "next") => {
      setSourcePreviewIndex((prev) => {
        if (prev === null) {
          return prev;
        }

        return getAdjacentSourceIndex(prev, sourceImages.length, direction);
      });
    },
    [sourceImages.length]
  );

  const completePendingReview = useCallback(
    (reviewedImageId: string, previousStatus: string) => {
      if (!shouldAutoAdvanceAfterReview(previousStatus)) {
        return;
      }

      const remainingPendingCount = generatedImages.filter(
        (img) => img.reviewStatus === "pending" && img.id !== reviewedImageId
      ).length;

      if (shouldShowAllDoneAfterReview(previousStatus, remainingPendingCount)) {
        setAllDone(true);
        clearCloseTimer();
        closeTimerRef.current = window.setTimeout(() => {
          onOpenChange(false);
        }, 2000);
        return;
      }

      const nextPendingIndex = getNextPendingIndex(generatedImages, currentIndex);
      if (nextPendingIndex !== null) {
        setCurrentIndex(nextPendingIndex);
      }
    },
    [clearCloseTimer, currentIndex, generatedImages, onOpenChange]
  );

  useEffect(() => {
    clearCloseTimer();
    setCurrentIndex(initialIndex);
    closeRejectPanel();
    closeSourcePreview();
    setAllDone(false);
    focusModal();
  }, [clearCloseTimer, closeRejectPanel, closeSourcePreview, focusModal, initialIndex, open]);

  useEffect(() => {
    mainZoom.reset();
    closeRejectPanel();
    closeSourcePreview();
    setAllDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mainZoom.reset is stable
  }, [closeRejectPanel, closeSourcePreview, currentIndex]);

  useLayoutEffect(() => {
    if (sourcePreviewIndex !== null) {
      sourceZoom.reset();
      sourcePreviewContainerRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sourceZoom.reset is stable
  }, [sourcePreviewIndex]);

  useEffect(() => {
    if (open && sourcePreviewIndex === null && !showRejectPanel && !isInputFocused) {
      focusModal();
    }
  }, [focusModal, isInputFocused, open, showRejectPanel, sourcePreviewIndex]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

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

  const handleApprove = useCallback(async () => {
    if (!currentImage || loading || !canApproveCurrent) {
      return;
    }

    const previousStatus = currentImage.reviewStatus;
    setLoading(true);

    try {
      await onReview(currentImage.id, "approved");
      completePendingReview(currentImage.id, previousStatus);
    } finally {
      setLoading(false);
    }
  }, [canApproveCurrent, completePendingReview, currentImage, loading, onReview]);

  const handleRegenerate = useCallback(async () => {
    if (!currentImage || loading || !canRegenerateCurrent) {
      return;
    }

    const previousStatus = currentImage.reviewStatus;
    setLoading(true);

    try {
      await onReview(currentImage.id, "regenerate");
      completePendingReview(currentImage.id, previousStatus);
    } finally {
      setLoading(false);
    }
  }, [canRegenerateCurrent, completePendingReview, currentImage, loading, onReview]);

  const handleReject = useCallback(async () => {
    if (!currentImage || loading || !canRejectCurrent) {
      return;
    }

    if (!canSubmitReject) {
      setRejectError("请选择或填写驳回理由");
      return;
    }

    const previousStatus = currentImage.reviewStatus;
    setLoading(true);
    setRejectError(null);

    try {
      await onReview(currentImage.id, "rejected", {
        presets: Array.from(selectedReasons),
        custom: customReason.trim(),
      });
      closeRejectPanel();
      completePendingReview(currentImage.id, previousStatus);
    } finally {
      setLoading(false);
    }
  }, [
    canRejectCurrent,
    canSubmitReject,
    closeRejectPanel,
    completePendingReview,
    currentImage,
    customReason,
    loading,
    onReview,
    selectedReasons,
  ]);

  const toggleReason = useCallback((id: string) => {
    setSelectedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setRejectError(null);
  }, []);

  const handleShortcutKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (sourcePreviewIndex !== null) {
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            e.stopPropagation();
            goToAdjacentSource("prev");
            break;
          case "ArrowDown":
            e.preventDefault();
            e.stopPropagation();
            goToAdjacentSource("next");
            break;
          case "Escape":
            e.preventDefault();
            e.stopPropagation();
            closeSourcePreview();
            break;
          default:
            break;
        }
        return;
      }

      if (isInputFocused) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeRejectPanel();
        }
        return;
      }

      switch (e.key) {
        case "a":
        case "A":
        case "Enter":
          if (!showRejectPanel && canApproveCurrent) {
            e.preventDefault();
            handleApprove();
          }
          break;
        case "r":
        case "R":
          if (!showRejectPanel && canRejectCurrent) {
            e.preventDefault();
            openRejectPanel();
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
            closeRejectPanel();
          }
          break;
        default:
          break;
      }
    },
    [
    canApproveCurrent,
    canRejectCurrent,
    closeRejectPanel,
    closeSourcePreview,
    goToAdjacentSource,
    goToNext,
    goToPrev,
    handleApprove,
    isInputFocused,
    mainZoom,
    openRejectPanel,
    showRejectPanel,
    sourcePreviewIndex,
  ]);

  if (!currentImage) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 flex flex-col overflow-hidden bg-gray-950 border-gray-800"
        ref={dialogContentRef}
        tabIndex={-1}
        onKeyDownCapture={handleShortcutKeyDown}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (sourcePreviewIndex !== null) {
            e.preventDefault();
            closeSourcePreview();
            return;
          }

          if (showRejectPanel) {
            e.preventDefault();
            closeRejectPanel();
          }
        }}
      >
        <VisuallyHidden>
          <DialogTitle>图片审核</DialogTitle>
        </VisuallyHidden>

        {allDone && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <p className="text-2xl font-bold text-white">所有图片审核完成</p>
              <p className="text-gray-400 mt-2">即将关闭...</p>
            </div>
          </div>
        )}

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
              <span className="ml-3 text-yellow-400">{pendingCount} 张待审核</span>
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

          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${reviewStatusColors[currentImage.reviewStatus]}`}
            >
              {reviewStatusLabels[currentImage.reviewStatus]}
            </span>
            <span className="text-xs text-gray-500">第 {currentImage.batchNumber} 批</span>
          </div>

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

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 flex">
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

            {sourceImages.length > 0 && (
              <div className="w-[280px] shrink-0 bg-gray-900 border-l border-gray-800 flex flex-col">
                <div className="px-3 py-2 border-b border-gray-800">
                  <span className="text-xs font-medium text-gray-400">
                    原图参考 ({sourceImages.length})
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {sourceImages.map((src, index) => (
                    <button
                      key={src.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => openSourcePreview(index)}
                      className={`w-full rounded-lg overflow-hidden border transition-colors group/src ${
                        sourcePreviewIndex === index
                          ? "border-yellow-500 ring-1 ring-yellow-500/40"
                          : "border-gray-700 hover:border-yellow-500"
                      }`}
                    >
                      <img
                        src={src.url}
                        alt={src.fileName || "原图"}
                        className="w-full object-contain bg-gray-800"
                      />
                      <div
                        className={`px-2 py-1 bg-gray-800 text-[10px] truncate text-center ${
                          sourcePreviewIndex === index
                            ? "text-yellow-400"
                            : "text-gray-500 group-hover/src:text-yellow-400"
                        }`}
                      >
                        {sourcePreviewIndex === index
                          ? `查看中 · 原图 ${index + 1}`
                          : `点击放大 · 原图 ${index + 1}`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-3">
            {showRejectPanel ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">
                    {currentImage.reviewStatus === "approved" ? "改为驳回" : "选择驳回理由"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeRejectPanel}
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
                    onChange={(e) => {
                      setCustomReason(e.target.value);
                      setRejectError(null);
                    }}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    placeholder="自定义驳回理由（可选）..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none h-10"
                  />
                  <Button
                    onClick={handleReject}
                    disabled={!canSubmitReject || loading}
                    className="bg-red-600 hover:bg-red-700 text-white h-10 px-6"
                  >
                    {loading
                      ? "处理中..."
                      : currentImage.reviewStatus === "approved"
                      ? "确认改为驳回"
                      : "确认驳回"}
                  </Button>
                </div>
                {rejectError && (
                  <p className="text-xs text-red-400">{rejectError}</p>
                )}
                <p className="text-xs text-gray-500">
                  可多选预设理由，也可补充自定义说明。按 `Esc` 可收起驳回面板。
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">
                    快捷键：A/Enter 通过，R 驳回，←/→ 切换审核图，+/− 缩放，0 重置
                  </div>
                  <div className="text-xs text-gray-600">
                    放大原图后可用 ↑/↓ 切换其他原图，Esc 优先关闭原图或驳回面板
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentImage.reviewStatus === "pending" && (
                    <>
                      <Button
                        onClick={handleApprove}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                      >
                        <Check className="h-4 w-4" />
                        {loading ? "处理中..." : "通过"}
                      </Button>
                      <Button
                        onClick={openRejectPanel}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                      >
                        <Ban className="h-4 w-4" />
                        驳回
                      </Button>
                      <Button
                        onClick={handleRegenerate}
                        disabled={loading}
                        variant="outline"
                        className="border-orange-600 text-orange-400 hover:bg-orange-600/20 gap-1.5"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {loading ? "处理中..." : "重新生成"}
                      </Button>
                    </>
                  )}

                  {currentImage.reviewStatus === "approved" && (
                    <>
                      <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/10 text-green-300 border border-green-500/30">
                        已通过，可改为驳回
                      </span>
                      <Button
                        onClick={openRejectPanel}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                      >
                        <Ban className="h-4 w-4" />
                        改为驳回
                      </Button>
                    </>
                  )}

                  {currentImage.reviewStatus === "rejected" && (
                    <>
                      <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/30">
                        已驳回，可改为通过
                      </span>
                      <Button
                        onClick={handleApprove}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                      >
                        <Check className="h-4 w-4" />
                        {loading ? "处理中..." : "改为通过"}
                      </Button>
                    </>
                  )}

                  {currentImage.reviewStatus === "regenerate" && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-300 border border-orange-500/30">
                      当前为待重制状态，本次不提供纠错操作
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {currentSourcePreview && (
          <div
            className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
            onClick={closeSourcePreview}
          >
            <div
              className="absolute top-4 right-4 z-10 flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-xs text-gray-300 bg-black/60 px-3 py-1 rounded-full">
                原图 {sourcePreviewIndex! + 1} / {sourceImages.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeSourcePreview}
                className="text-white hover:bg-white/20 h-10 w-10"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div
              ref={(node) => {
                sourcePreviewContainerRef.current = node;
                sourceZoom.containerRef.current = node;
              }}
              className="max-w-[90%] max-h-[90%] relative overflow-hidden flex items-center justify-center"
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              onWheel={sourceZoom.handleWheel}
              onMouseDown={sourceZoom.handleMouseDown}
              onMouseMove={sourceZoom.handleMouseMove}
              onMouseUp={sourceZoom.handleMouseUp}
              onDoubleClick={sourceZoom.handleDoubleClick}
            >
              <img
                key={currentSourcePreview.id}
                src={currentSourcePreview.url}
                alt={currentSourcePreview.fileName || "原图预览"}
                className="max-w-full max-h-[85vh] object-contain"
                style={sourceZoom.style}
                draggable={false}
              />
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <span className="text-xs text-gray-400 bg-black/60 px-3 py-1 rounded-full">
                ↑/↓ 切换原图 · 滚轮缩放 · 双击放大 · Esc 关闭
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
