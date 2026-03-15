export type ReviewStatus = "pending" | "approved" | "rejected" | "regenerate";

interface ReviewableImage {
  reviewStatus: string;
}

export function getNextPendingIndex(
  images: ReviewableImage[],
  currentIndex: number
): number | null {
  for (let i = currentIndex + 1; i < images.length; i++) {
    if (images[i].reviewStatus === "pending") {
      return i;
    }
  }

  for (let i = 0; i < currentIndex; i++) {
    if (images[i].reviewStatus === "pending") {
      return i;
    }
  }

  return null;
}

export function getAdjacentSourceIndex(
  currentIndex: number,
  total: number,
  direction: "prev" | "next"
): number | null {
  if (currentIndex < 0 || currentIndex >= total) {
    return null;
  }

  if (direction === "prev") {
    return currentIndex > 0 ? currentIndex - 1 : null;
  }

  return currentIndex < total - 1 ? currentIndex + 1 : null;
}

export function canApproveImage(status: string): boolean {
  return status === "pending" || status === "rejected";
}

export function canRejectImage(status: string): boolean {
  return status === "pending" || status === "approved";
}

export function canRegenerateImage(status: string): boolean {
  return status === "pending";
}

export function requiresRejectionReasonForCorrection(
  previousStatus: string,
  nextStatus: string
): boolean {
  return previousStatus !== "pending" && nextStatus === "rejected";
}

export function shouldAutoAdvanceAfterReview(status: string): boolean {
  return status === "pending";
}

export function shouldShowAllDoneAfterReview(
  status: string,
  remainingPendingCount: number
): boolean {
  return status === "pending" && remainingPendingCount === 0;
}
