import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, type ProductStatus } from "@/lib/db/schema";
import {
  buildGeneratedProductName,
  normalizeBatchNumber,
} from "@/lib/product-identity";
import { getSceneById } from "@/lib/scenes";
import { eq, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";

// Get product number (format: YY + 4-digit sequence)
async function getNextProductNumber(): Promise<string> {
  const year = new Date().getFullYear().toString().slice(2);
  const lastProduct = await db.query.products.findFirst({
    orderBy: (products, { desc }) => [desc(products.productNumber)],
  });

  let sequence = 1;
  if (lastProduct) {
    const lastYear = lastProduct.productNumber.slice(0, 2);
    if (lastYear === year) {
      sequence = parseInt(lastProduct.productNumber.slice(2)) + 1;
    }
  }

  return `${year}${sequence.toString().padStart(4, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await import("next/headers").then((h) => h.headers()),
    });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const conditions = [eq(products.userId, session.user.id)];
    if (status) {
      conditions.push(eq(products.status, status as ProductStatus || "draft"));
    }

    const offset = (page - 1) * limit;

    const [productsList, total] = await Promise.all([
      db
        .select()
        .from(products)
        .where(and(...conditions))
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: products.id })
        .from(products)
        .where(and(...conditions)),
    ]);

    return NextResponse.json({
      products: productsList,
      pagination: {
        page,
        limit,
        total: total.length,
        totalPages: Math.ceil(total.length / limit),
      },
    });
  } catch (error) {
    console.error("Products list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await import("next/headers").then((h) => h.headers()),
    });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      category,
      description,
      shootingRequirements,
      selectedSceneId,
      specialNotes,
      deliveryCount,
      batchNumber,
    } = body;

    // Validate required fields
    if (!category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const selectedScene = getSceneById(
      typeof selectedSceneId === "string" ? selectedSceneId.trim() : ""
    );

    if (!selectedScene) {
      return NextResponse.json(
        { error: "无效的场景选择" },
        { status: 400 }
      );
    }

    // Get next product number
    const productNumber = await getNextProductNumber();
    const resolvedBatchNumber = normalizeBatchNumber(batchNumber);
    const generatedName = buildGeneratedProductName({
      requestedName: typeof name === "string" ? name : null,
      productNumber,
      batchNumber: resolvedBatchNumber,
      sceneName: selectedScene.name,
    });

    // Create product
    const productId = nanoid();
    await db.insert(products).values({
      id: productId,
      productNumber,
      userId: session.user.id,
      name: generatedName,
      category,
      description: description || null,
      shootingRequirements:
        typeof shootingRequirements === "string" && shootingRequirements.trim().length > 0
          ? shootingRequirements.trim()
          : null,
      stylePreference: selectedScene.id,
      specialNotes: specialNotes || null,
      deliveryCount: deliveryCount || 6,
      selectedStyleId: selectedScene.id,
      batchNumber: resolvedBatchNumber,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      product: {
        id: productId,
        productNumber,
        name: generatedName,
        batchNumber: resolvedBatchNumber,
        selectedSceneId: selectedScene.id,
        modelId: null,
        status: "draft",
      },
    });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
