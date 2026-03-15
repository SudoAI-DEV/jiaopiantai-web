import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { productGeneratedImages, products, userProfiles } from "@/lib/db/schema";
import { requiresRejectionReasonForCorrection } from "@/components/review/review-flow";
import { eq } from "drizzle-orm";

function hasRejectionReason(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const rejectionReason = value as {
    presets?: unknown;
    custom?: unknown;
  };

  const presets = Array.isArray(rejectionReason.presets)
    ? rejectionReason.presets.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : [];
  const custom =
    typeof rejectionReason.custom === "string"
      ? rejectionReason.custom.trim()
      : "";

  return presets.length > 0 || custom.length > 0;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await params;
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // Check admin role
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, session.user.id),
    });

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = await request.json();
    const { status, rejectionReason } = body;

    if (!["pending", "approved", "rejected", "regenerate"].includes(status)) {
      return NextResponse.json({ error: "无效的审核状态" }, { status: 400 });
    }

    // Get the image
    const image = await db.query.productGeneratedImages.findFirst({
      where: eq(productGeneratedImages.id, imageId),
    });

    if (!image) {
      return NextResponse.json({ error: "图片不存在" }, { status: 404 });
    }

    if (
      requiresRejectionReasonForCorrection(image.reviewStatus || "", status) &&
      !hasRejectionReason(rejectionReason)
    ) {
      return NextResponse.json(
        { error: "改为驳回时必须提供驳回理由" },
        { status: 400 }
      );
    }

    // Update image review status
    await db
      .update(productGeneratedImages)
      .set({
        reviewStatus: status,
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
        rejectionReason: status === "rejected" && rejectionReason
          ? (typeof rejectionReason === "string" ? rejectionReason : JSON.stringify(rejectionReason))
          : null,
      })
      .where(eq(productGeneratedImages.id, imageId));

    // Check if all images are reviewed - update product status if needed
    const allImages = await db
      .select()
      .from(productGeneratedImages)
      .where(eq(productGeneratedImages.productId, image.productId));

    const hasPending = allImages.some((img) => img.reviewStatus === "pending");

    if (!hasPending) {
      // Check if there are any approved images
      const hasApproved = allImages.some((img) => img.reviewStatus === "approved");
      const hasRegenerate = allImages.some((img) => img.reviewStatus === "regenerate");

      if (hasRegenerate) {
        // Need to regenerate - keep in reviewing or move to reworking
        // For now, keep in reviewing until regenerated
      } else if (hasApproved) {
        // Move to reviewing if not already there
        const product = await db.query.products.findFirst({
          where: eq(products.id, image.productId),
        });

        if (product && product.status === "reviewing") {
          // Product stays in reviewing for admin to review more or deliver
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Review error:", error);
    return NextResponse.json({ error: "审核失败" }, { status: 500 });
  }
}
