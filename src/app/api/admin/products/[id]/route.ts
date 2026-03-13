import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { products, productSourceImages, productGeneratedImages, aiGenerationTasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";

// DELETE /api/admin/products/[id] - Delete a product and its related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;

    // Check if product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Delete related data in transaction
    await db.transaction(async (tx) => {
      // Delete generated images
      await tx
        .delete(productGeneratedImages)
        .where(eq(productGeneratedImages.productId, id));

      // Delete source images
      await tx
        .delete(productSourceImages)
        .where(eq(productSourceImages.productId, id));

      // Delete AI tasks
      await tx
        .delete(aiGenerationTasks)
        .where(eq(aiGenerationTasks.productId, id));

      // Delete product
      await tx
        .delete(products)
        .where(eq(products.id, id));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
