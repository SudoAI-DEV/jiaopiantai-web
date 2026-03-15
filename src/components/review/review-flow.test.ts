import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canApproveImage,
  canRegenerateImage,
  canRejectImage,
  getAdjacentSourceIndex,
  getNextPendingIndex,
  requiresRejectionReasonForCorrection,
  shouldAutoAdvanceAfterReview,
  shouldShowAllDoneAfterReview,
} from "./review-flow.ts";

describe("review flow helpers", () => {
  it("finds the next pending image and wraps to the start", () => {
    const images = [
      { reviewStatus: "approved" },
      { reviewStatus: "pending" },
      { reviewStatus: "rejected" },
      { reviewStatus: "pending" },
    ];

    assert.equal(getNextPendingIndex(images, 1), 3);
    assert.equal(getNextPendingIndex(images, 3), 1);
  });

  it("returns null when there is no other pending image", () => {
    const images = [
      { reviewStatus: "approved" },
      { reviewStatus: "pending" },
      { reviewStatus: "rejected" },
    ];

    assert.equal(getNextPendingIndex(images, 1), null);
  });

  it("computes adjacent source preview indexes without crossing bounds", () => {
    assert.equal(getAdjacentSourceIndex(2, 5, "prev"), 1);
    assert.equal(getAdjacentSourceIndex(2, 5, "next"), 3);
    assert.equal(getAdjacentSourceIndex(0, 5, "prev"), null);
    assert.equal(getAdjacentSourceIndex(4, 5, "next"), null);
  });

  it("exposes the reversible review action matrix", () => {
    assert.equal(canApproveImage("pending"), true);
    assert.equal(canApproveImage("rejected"), true);
    assert.equal(canApproveImage("approved"), false);

    assert.equal(canRejectImage("pending"), true);
    assert.equal(canRejectImage("approved"), true);
    assert.equal(canRejectImage("rejected"), false);

    assert.equal(canRegenerateImage("pending"), true);
    assert.equal(canRegenerateImage("approved"), false);
  });

  it("only auto-advances and shows completion for pending first-review actions", () => {
    assert.equal(shouldAutoAdvanceAfterReview("pending"), true);
    assert.equal(shouldAutoAdvanceAfterReview("approved"), false);
    assert.equal(shouldAutoAdvanceAfterReview("rejected"), false);

    assert.equal(shouldShowAllDoneAfterReview("pending", 0), true);
    assert.equal(shouldShowAllDoneAfterReview("pending", 1), false);
    assert.equal(shouldShowAllDoneAfterReview("approved", 0), false);
  });

  it("requires rejection reasons when correcting an existing decision to rejected", () => {
    assert.equal(
      requiresRejectionReasonForCorrection("approved", "rejected"),
      true
    );
    assert.equal(
      requiresRejectionReasonForCorrection("pending", "rejected"),
      false
    );
    assert.equal(
      requiresRejectionReasonForCorrection("rejected", "approved"),
      false
    );
  });
});
