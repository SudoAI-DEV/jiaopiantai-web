import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { products, userProfiles, productGeneratedImages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
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

    // Get product
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return NextResponse.json({ error: "产品不存在" }, { status: 404 });
    }

    // Check status - only "reviewing" can be completed
    if (product.status !== "reviewing") {
      return NextResponse.json(
        { error: "只有审核中的产品才能完成审核" },
        { status: 400 }
      );
    }

    // Check if there are approved images
    const approvedImages = await db
      .select()
      .from(productGeneratedImages)
      .where(
        and(
          eq(productGeneratedImages.productId, productId),
          eq(productGeneratedImages.reviewStatus, "approved")
        )
      );

    if (approvedImages.length === 0) {
      return NextResponse.json(
        { error: "请先选择至少一张审核通过的图片" },
        { status: 400 }
      );
    }

    // Update product status to client_reviewing and record reviewer info
    await db
      .update(products)
      .set({
        status: "client_reviewing",
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    return NextResponse.json({
      success: true,
      approvedCount: approvedImages.length,
    });
  } catch (error) {
    console.error("Complete review error:", error);
    return NextResponse.json({ error: "完成审核失败" }, { status: 500 });
  }
}
