import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { products, userProfiles, creditTransactions, productGeneratedImages, deliveryBatches, deliveryImages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

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

    if (product.status !== "reviewing") {
      return NextResponse.json({ error: "产品不在可交付状态" }, { status: 400 });
    }

    // Get approved images
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
      return NextResponse.json({ error: "没有通过审核的图片" }, { status: 400 });
    }

    // Create delivery batch
    const batchId = nanoid();
    await db.insert(deliveryBatches).values({
      id: batchId,
      productId,
      batchNumber: 1,
      imageCount: approvedImages.length,
      deliveredAt: new Date(),
      deliveredBy: session.user.id,
      createdAt: new Date(),
    });

    // Create delivery images
    await Promise.all(
      approvedImages.map((img, index) =>
        db.insert(deliveryImages).values({
          id: nanoid(),
          batchId: batchId,
          imageId: img.id,
          sortOrder: index,
          deliveredAt: new Date(),
        })
      )
    );

    // Update product status to client_reviewing
    await db
      .update(products)
      .set({
        status: "client_reviewing",
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    // Confirm credit deduction (unfreeze)
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, product.userId),
    });

    const frozen = userProfile?.creditsFrozen || 0;

    if (userProfile && frozen > 0) {
      const newFrozen = frozen - 1;
      const newTotalSpent = (userProfile.creditsTotalSpent || 0) + 1;
      const newBalance = userProfile.creditsBalance || 0;

      await db
        .update(userProfiles)
        .set({
          creditsFrozen: newFrozen,
          creditsTotalSpent: newTotalSpent,
        })
        .where(eq(userProfiles.id, product.userId));

      // Create completion transaction
      await db.insert(creditTransactions).values({
        id: nanoid(),
        userId: product.userId,
        type: "completion",
        amount: -1,
        balanceAfter: newBalance,
        referenceId: productId,
        description: `产品 ${product.productNumber} 完成`,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      deliveredCount: approvedImages.length,
    });
  } catch (error) {
    console.error("Deliver error:", error);
    return NextResponse.json({ error: "交付失败" }, { status: 500 });
  }
}
