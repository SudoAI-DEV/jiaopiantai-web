/**
 * Import legacy generated images from local filesystem into the system database and R2 storage.
 *
 * Usage:
 *   npx tsx scripts/import-legacy-images.ts --user-id <id> --env <local|production> [--base-dir <path>] [--dry-run] [--batch-filter <name>]
 */

import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import yaml from "js-yaml";
import * as schema from "../src/lib/db/schema-pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

// --------------- Scene Mapping ---------------

const SCENE_NAME_TO_ID: Record<string, string> = {
  "海边艺术": "seaside-art",
  "自然田园": "country-garden",
  "田园自然": "country-garden",
  "都市街拍": "urban-street",
  "都市松弛": "urban-street",
  "室外街拍": "urban-street",
  "艺术建筑": "architectural-editorial",
};

function resolveSceneId(name: string): string | null {
  return SCENE_NAME_TO_ID[name] || null;
}

// --------------- Types ---------------

interface ProductYamlConfig {
  product_code?: string;
  scene?: string;
  model_image?: string;
  selected_images?: string[];
  selected_image_notes?: string[];
  custom_requirements?: string[];
  notes?: string[];
}

interface ParsedProduct {
  orderBatch: string; // e.g. "2026_春夏_第一批"
  batchNumber: number; // e.g. 1, 2 (第一批=1, 第二批=2)
  sceneStyle: string; // e.g. "海边艺术"
  sceneId: string | null; // e.g. "seaside-art"
  productNumber: string; // e.g. "2-SJ-01"
  statusNote: string | null; // e.g. "通过", "需补拍"
  dirPath: string; // absolute path to product dir
  sourceImages: string[]; // absolute paths to source jpg files
  generatedBatches: {
    batchNumber: number;
    images: string[]; // absolute paths to generated png/jpg files
  }[];
  yamlConfig: ProductYamlConfig | null;
  modelImageFile: string | null; // resolved model file name, e.g. "模特1号.png"
}

interface ImportStats {
  productsCreated: number;
  productsSkipped: number;
  productsUpdated: number;
  sourceImagesUploaded: number;
  generatedImagesUploaded: number;
  modelsCreated: number;
  modelsSkipped: number;
  errors: number;
}

interface ProductIdMapping {
  [productNumber: string]: {
    id: string;
    batchNumber: number;
  };
}

interface ModelIdMapping {
  [fileName: string]: string; // fileName -> customerModels.id
}

// One-off fixed mapping for legacy customer models that already exist in DB.
const LEGACY_MODEL_ID_OVERRIDES: Record<string, ModelIdMapping> = {
  PhzRhQC8xROPykUs4BRo3: {
    "模特1号.png": "JRRuFlPMJLXc63-vLpuJB",
    "模特2号.png": "pKCzwDc3SGs1hyjxl9uAG",
    "模特3号.png": "gNuA6gprQgJ-yOAjhsCa0",
  },
};

interface ImportMetadata {
  env: string;
  userId: string;
  importedAt: string;
  products: ProductIdMapping;
  models?: ModelIdMapping;
}

function getSeededModelIds(userId: string): ModelIdMapping {
  return LEGACY_MODEL_ID_OVERRIDES[userId] || {};
}

// --------------- CLI Argument Parsing ---------------

function parseArgs(): {
  userId: string;
  env: "local" | "production";
  baseDir: string;
  dryRun: boolean;
  batchFilter: string | null;
  productFilter: Set<string> | null;
} {
  const args = process.argv.slice(2);
  let userId = "";
  let env: "local" | "production" = "local";
  let baseDir = "客户/花姐&寅寅";
  let dryRun = false;
  let batchFilter: string | null = null;
  let productFilter: Set<string> | null = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--user-id":
        userId = args[++i];
        break;
      case "--env":
        const envArg = args[++i];
        if (envArg !== "local" && envArg !== "production") {
          console.error("Error: --env must be 'local' or 'production'");
          process.exit(1);
        }
        env = envArg;
        break;
      case "--base-dir":
        baseDir = args[++i];
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--batch-filter":
        batchFilter = args[++i];
        break;
      case "--product-filter":
        productFilter = new Set(args[++i].split(",").map((s) => s.trim()));
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!userId) {
    console.error("Error: --user-id is required");
    console.error(
      "Usage: npx tsx scripts/import-legacy-images.ts --user-id <id> --env <local|production> [--base-dir <path>] [--dry-run] [--batch-filter <name>] [--product-filter <num1,num2,...>]"
    );
    process.exit(1);
  }

  return { userId, env, baseDir, dryRun, batchFilter, productFilter };
}

// --------------- Metadata File Helpers ---------------

function getMetadataPath(env: string, userId: string): string {
  return path.join(".import-cache", `${env}_${userId}_products.json`);
}

function loadMetadata(env: string, userId: string): ImportMetadata | null {
  const filePath = getMetadataPath(env, userId);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      return null;
    }
  }
  return null;
}

function saveMetadata(
  env: string,
  userId: string,
  products: ProductIdMapping,
  models: ModelIdMapping,
): void {
  const filePath = getMetadataPath(env, userId);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const metadata: ImportMetadata = {
    env,
    userId,
    importedAt: new Date().toISOString(),
    products,
    models,
  };
  
  fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
}

// --------------- YAML Config Parser ---------------

function loadProductYaml(productDir: string): ProductYamlConfig | null {
  const yamlPath = path.join(productDir, "配置.yaml");
  if (!fs.existsSync(yamlPath)) return null;
  try {
    return yaml.load(fs.readFileSync(yamlPath, "utf-8")) as ProductYamlConfig;
  } catch {
    console.warn(`  ⚠ Failed to parse YAML: ${yamlPath}`);
    return null;
  }
}

function resolveModelFileName(yamlConfig: ProductYamlConfig | null): string | null {
  if (!yamlConfig?.model_image) return null;
  // model_image is a relative path like "../../../models/模特1号.png"
  return path.basename(yamlConfig.model_image);
}

// --------------- Database & R2 Setup ---------------

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Error: DATABASE_URL not set");
    process.exit(1);
  }
  const sql = postgres(url);
  return { db: drizzle(sql, { schema }), sql };
}

function createS3Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint:
      process.env.R2_ENDPOINT ||
      "https://88a96747babe00a5c70ab1954e53e136.r2.cloudflarestorage.com",
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });
}

// --------------- Directory Parsing ---------------

// Directories at the base level that are NOT order batches
const SKIP_BASE_DIRS = new Set(["models", "风格参考", "场景"]);

function isBatchDir(name: string): boolean {
  // Match patterns like "2026_春夏_第一批", "产品 2", etc.
  // Basically any directory that isn't in the skip list
  return !SKIP_BASE_DIRS.has(name) && !name.startsWith(".");
}

function parseBatchNumber(orderBatch: string): number {
  if (orderBatch.includes("第一批")) return 1;
  if (orderBatch.includes("第二批")) return 2;
  if (orderBatch.includes("第三批")) return 3;
  if (orderBatch.includes("第四批")) return 4;
  if (orderBatch.includes("第五批")) return 5;
  // Extract trailing number: "产品 2" → 2
  const numMatch = orderBatch.match(/(\d+)\s*$/);
  if (numMatch) return parseInt(numMatch[1], 10);
  return 1;
}

function stripStyleSuffix(name: string): string {
  return name.replace(/-已全部交付$/, "");
}

function parseProductDirName(name: string): {
  productNumber: string;
  statusNote: string | null;
} {
  // Match product number pattern: X-XX-XX (e.g. 2-SJ-01)
  const match = name.match(/^(\d+-[A-Z]+-\d+)(?:-(.+))?$/);
  if (match) {
    return {
      productNumber: match[1],
      statusNote: match[2] || null,
    };
  }
  return { productNumber: name, statusNote: null };
}

function isImageFile(fileName: string): boolean {
  const ext = fileName.toLowerCase();
  return (
    ext.endsWith(".jpg") ||
    ext.endsWith(".jpeg") ||
    ext.endsWith(".png") ||
    ext.endsWith(".webp")
  );
}

function shouldSkipFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower === ".ds_store" ||
    lower === "icon" ||
    lower === "icon\r" ||
    lower.endsWith(".yaml") ||
    lower.endsWith(".yml") ||
    lower.endsWith(".json") ||
    lower.startsWith(".")
  );
}

function scanDirectory(
  baseDir: string,
  batchFilter: string | null,
  productFilter: Set<string> | null,
): ParsedProduct[] {
  const absoluteBase = path.resolve(baseDir);
  const products: ParsedProduct[] = [];

  if (!fs.existsSync(absoluteBase)) {
    console.error(`Error: Base directory not found: ${absoluteBase}`);
    process.exit(1);
  }

  // Level 1: Auto-detect order batch directories
  const orderBatchDirs = fs
    .readdirSync(absoluteBase, { withFileTypes: true })
    .filter((d) => d.isDirectory() && isBatchDir(d.name));

  for (const batchDir of orderBatchDirs) {
    const orderBatch = batchDir.name;
    const batchNumber = parseBatchNumber(orderBatch);

    if (batchFilter && orderBatch !== batchFilter) {
      continue;
    }

    const batchPath = path.join(absoluteBase, orderBatch);

    // Level 2: Scene styles
    const styleDirs = fs
      .readdirSync(batchPath, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const styleDir of styleDirs) {
      const sceneStyle = stripStyleSuffix(styleDir.name);
      const stylePath = path.join(batchPath, styleDir.name);

      // Level 3: Product directories
      const productDirs = fs
        .readdirSync(stylePath, { withFileTypes: true })
        .filter((d) => d.isDirectory());

      for (const productDir of productDirs) {
        const { productNumber, statusNote } = parseProductDirName(
          productDir.name
        );

        // Apply product filter if specified
        if (productFilter && !productFilter.has(productNumber)) continue;

        const productPath = path.join(stylePath, productDir.name);

        // Collect source images (root-level jpg files)
        const rootFiles = fs
          .readdirSync(productPath, { withFileTypes: true })
          .filter((f) => f.isFile());

        const sourceImages = rootFiles
          .filter((f) => !shouldSkipFile(f.name) && isImageFile(f.name))
          .map((f) => path.join(productPath, f.name));

        // Load YAML config
        const yamlConfig = loadProductYaml(productPath);

        // Collect generated batches
        const generatedBatches: ParsedProduct["generatedBatches"] = [];
        const generatedDir = path.join(productPath, "生成");

        if (fs.existsSync(generatedDir)) {
          const batchDirs = fs
            .readdirSync(generatedDir, { withFileTypes: true })
            .filter((d) => d.isDirectory() && d.name.startsWith("batch_"))
            .sort((a, b) => a.name.localeCompare(b.name));

          for (const bd of batchDirs) {
            // Handle both "batch_01" and "batch_v2" naming
            const numMatch = bd.name.match(/batch_(?:v)?(\d+)/);
            const batchNum = numMatch ? parseInt(numMatch[1], 10) : 0;
            const batchDirPath = path.join(generatedDir, bd.name);

            const images = fs
              .readdirSync(batchDirPath, { withFileTypes: true })
              .filter((f) => f.isFile() && isImageFile(f.name))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((f) => path.join(batchDirPath, f.name));

            if (images.length > 0) {
              generatedBatches.push({ batchNumber: batchNum, images });
            }
          }
        }

        products.push({
          orderBatch,
          batchNumber,
          sceneStyle,
          sceneId: resolveSceneId(sceneStyle),
          productNumber,
          statusNote,
          dirPath: productPath,
          sourceImages,
          generatedBatches,
          yamlConfig,
          modelImageFile: resolveModelFileName(yamlConfig),
        });
      }
    }
  }

  return products.sort((a, b) => {
    if (a.orderBatch !== b.orderBatch)
      return a.orderBatch.localeCompare(b.orderBatch);
    if (a.sceneStyle !== b.sceneStyle)
      return a.sceneStyle.localeCompare(b.sceneStyle);
    return a.productNumber.localeCompare(b.productNumber);
  });
}

// --------------- Dry-Run ---------------

function printDryRun(products: ParsedProduct[], modelsDir: string | null) {
  console.log("\n========== DRY RUN ==========\n");

  // Show models discovery
  if (modelsDir && fs.existsSync(modelsDir)) {
    const modelFiles = fs.readdirSync(modelsDir).filter((f) => isImageFile(f));
    console.log(`🧑‍🎤 Customer models (${modelsDir}):`);
    for (const f of modelFiles) {
      console.log(`  ${f}`);
    }
    console.log();
  }

  // Group by orderBatch -> sceneStyle
  const groups = new Map<string, Map<string, ParsedProduct[]>>();
  for (const p of products) {
    if (!groups.has(p.orderBatch)) groups.set(p.orderBatch, new Map());
    const styleMap = groups.get(p.orderBatch)!;
    if (!styleMap.has(p.sceneStyle)) styleMap.set(p.sceneStyle, []);
    styleMap.get(p.sceneStyle)!.push(p);
  }

  let totalProducts = 0;
  let totalSourceImages = 0;
  let totalGeneratedImages = 0;

  for (const [batch, styleMap] of groups) {
    console.log(`📦 ${batch} (批次 ${parseBatchNumber(batch)})`);
    for (const [style, prods] of styleMap) {
      const sceneId = resolveSceneId(style);
      const srcCount = prods.reduce(
        (sum, p) => sum + p.sourceImages.length,
        0
      );
      const genByBatch = new Map<number, number>();
      let genTotal = 0;
      for (const p of prods) {
        for (const b of p.generatedBatches) {
          genByBatch.set(
            b.batchNumber,
            (genByBatch.get(b.batchNumber) || 0) + b.images.length
          );
          genTotal += b.images.length;
        }
      }

      const batchInfo = [...genByBatch.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([bn, count]) => `batch_${String(bn).padStart(2, "0")}:${count}`)
        .join(", ");

      const sceneLabel = sceneId ? `→ ${sceneId}` : "⚠ unmapped";
      console.log(
        `  🎨 ${style} (${sceneLabel}): ${prods.length} products, ${srcCount} source imgs, ${genTotal} generated imgs (${batchInfo})`
      );

      for (const p of prods) {
        const noteStr = p.statusNote ? ` [${p.statusNote}]` : "";
        const batches = p.generatedBatches
          .map((b) => `b${b.batchNumber}:${b.images.length}`)
          .join(" ");
        const modelStr = p.modelImageFile ? ` 🧑‍🎤${p.modelImageFile}` : "";
        const yamlStr = p.yamlConfig ? " 📄yaml" : "";
        console.log(
          `    ${p.productNumber}${noteStr}: ${p.sourceImages.length} src, ${batches}${modelStr}${yamlStr}`
        );
      }

      totalProducts += prods.length;
      totalSourceImages += srcCount;
      totalGeneratedImages += genTotal;
    }
    console.log();
  }

  // Scene mapping summary
  const unmappedScenes = new Set<string>();
  for (const p of products) {
    if (!p.sceneId) unmappedScenes.add(p.sceneStyle);
  }
  if (unmappedScenes.size > 0) {
    console.log("⚠ Unmapped scene names (will be stored as category only):");
    for (const s of unmappedScenes) {
      console.log(`  - "${s}"`);
    }
    console.log();
  }

  console.log("========== SUMMARY ==========");
  console.log(`Total products:         ${totalProducts}`);
  console.log(`Total source images:    ${totalSourceImages}`);
  console.log(`Total generated images: ${totalGeneratedImages}`);
  console.log("=============================\n");
}

// --------------- R2 Upload ---------------

async function uploadToR2(
  s3: S3Client,
  localPath: string,
  key: string
): Promise<string> {
  const buffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };

  await s3.send(
    new PutObjectCommand({
      Bucket: (process.env.R2_BUCKET_NAME || "jiaopiantai").trim(),
      Key: key,
      Body: buffer,
      ContentType: mimeMap[ext] || "application/octet-stream",
    })
  );

  return `/api/files/${key}`;
}

// Concurrency-limited parallel execution
async function pMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

// --------------- Short batch name helper ---------------

function shortBatchName(orderBatch: string): string {
  if (orderBatch.includes("第一批")) return "第一批";
  if (orderBatch.includes("第二批")) return "第二批";
  if (orderBatch.includes("第三批")) return "第三批";
  return orderBatch;
}

// --------------- Customer Models Import ---------------

function scanModelsDir(baseDir: string): { filePath: string; fileName: string }[] {
  const modelsDir = path.join(path.resolve(baseDir), "models");
  if (!fs.existsSync(modelsDir)) return [];

  return fs
    .readdirSync(modelsDir, { withFileTypes: true })
    .filter((f) => f.isFile() && isImageFile(f.name))
    .map((f) => ({
      filePath: path.join(modelsDir, f.name),
      fileName: f.name,
    }));
}

async function importCustomerModels(
  baseDir: string,
  userId: string,
  db: ReturnType<typeof drizzle<typeof schema>>,
  s3: S3Client,
  existingModelIds: ModelIdMapping,
): Promise<{ modelIds: ModelIdMapping; created: number; skipped: number }> {
  const modelFiles = scanModelsDir(baseDir);
  const modelIds: ModelIdMapping = { ...existingModelIds };
  let created = 0;
  let skipped = 0;

  for (const { filePath, fileName } of modelFiles) {
    if (modelIds[fileName]) {
      console.log(`  ⏭ Model already imported: ${fileName} → ${modelIds[fileName]}`);
      skipped++;
      continue;
    }

    // Check if model exists in DB by name for this user
    const existing = await db
      .select({ id: schema.customerModels.id })
      .from(schema.customerModels)
      .where(
        and(
          eq(schema.customerModels.userId, userId),
          eq(schema.customerModels.name, path.parse(fileName).name),
        )
      )
      .limit(1);

    if (existing.length > 0) {
      modelIds[fileName] = existing[0].id;
      console.log(`  ⏭ Model exists in DB: ${fileName} → ${existing[0].id}`);
      skipped++;
      continue;
    }

    // Upload to R2
    const modelId = nanoid();
    const key = `models/${userId}/${modelId}/${fileName}`;
    const url = await uploadToR2(s3, filePath, key);
    const fileStats = fs.statSync(filePath);
    const ext = path.extname(fileName).toLowerCase();

    await db.insert(schema.customerModels).values({
      id: modelId,
      userId,
      name: path.parse(fileName).name,
      imageUrl: url,
      fileName,
      fileSize: fileStats.size,
      mimeType: ext === ".png" ? "image/png" : "image/jpeg",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    modelIds[fileName] = modelId;
    console.log(`  ✅ Model created: ${fileName} → ${modelId}`);
    created++;
  }

  return { modelIds, created, skipped };
}

// --------------- Main Import Logic ---------------

async function importProducts(
  products: ParsedProduct[],
  userId: string,
  env: "local" | "production",
  db: ReturnType<typeof drizzle<typeof schema>>,
  s3: S3Client,
  metadata: ImportMetadata | null,
  modelIds: ModelIdMapping,
): Promise<{ stats: ImportStats; productIds: ProductIdMapping }> {
  const stats: ImportStats = {
    productsCreated: 0,
    productsSkipped: 0,
    productsUpdated: 0,
    sourceImagesUploaded: 0,
    generatedImagesUploaded: 0,
    modelsCreated: 0,
    modelsSkipped: 0,
    errors: 0,
  };

  const productIds: ProductIdMapping = metadata?.products || {};

  for (const product of products) {
    const label = `${shortBatchName(product.orderBatch)}-${product.sceneStyle}-${product.productNumber}`;
    console.log(`\n--- Processing: ${label} ---`);

    let productId: string;
    let isExisting = false;

    // Check if product already exists in metadata (for re-runs)
    if (productIds[product.productNumber]) {
      productId = productIds[product.productNumber].id;
      isExisting = true;
      console.log(`  ⏭ Using existing product: ${productId}`);
    } else {
      // Check if product exists in database
      const existing = await db
        .select({
          id: schema.products.id,
          batchNumber: schema.products.batchNumber,
          selectedSceneId: schema.products.selectedSceneId,
          modelId: schema.products.modelId,
        })
        .from(schema.products)
        .where(
          and(
            eq(schema.products.userId, userId),
            eq(schema.products.productNumber, product.productNumber)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        productId = existing[0].id;
        isExisting = true;
        productIds[product.productNumber] = { id: productId, batchNumber: product.batchNumber };
        console.log(`  ⏭ Using existing product from DB: ${productId}`);
        
        // Patch missing fields on existing products
        const updates: Record<string, unknown> = {};
        if (!existing[0].batchNumber) updates.batchNumber = product.batchNumber;
        if (!existing[0].selectedSceneId && product.sceneId) updates.selectedSceneId = product.sceneId;
        if (!existing[0].modelId && product.modelImageFile) {
          const mid = modelIds[product.modelImageFile];
          if (mid) updates.modelId = mid;
        }
        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date();
          await db
            .update(schema.products)
            .set(updates)
            .where(eq(schema.products.id, productId));
          console.log(`  📝 Updated fields: ${Object.keys(updates).filter(k => k !== 'updatedAt').join(', ')}`);
          stats.productsUpdated++;
        }
      } else {
        // Create new product
        productId = nanoid();
        productIds[product.productNumber] = { id: productId, batchNumber: product.batchNumber };
      }
    }

    if (!isExisting) {
      const now = new Date();
      const customReqs = product.yamlConfig?.custom_requirements;
      const resolvedModelId = product.modelImageFile
        ? modelIds[product.modelImageFile] || null
        : null;

      await db.insert(schema.products).values({
        id: productId,
        userId,
        productNumber: product.productNumber,
        name: `${shortBatchName(product.orderBatch)}-${product.sceneStyle}-${product.productNumber}`,
        category: "clothing",
        status: "reviewing",
        selectedSceneId: product.sceneId,
        shootingRequirements: customReqs?.length ? customReqs.join("\n") : null,
        specialNotes: product.statusNote,
        modelId: resolvedModelId,
        batchNumber: product.batchNumber,
        createdAt: now,
        updatedAt: now,
      });

      console.log(
        `  ✅ Product created: ${productId} (batch ${product.batchNumber}, scene=${product.sceneId || "?"}, model=${resolvedModelId || "none"})`
      );
      stats.productsCreated++;
    }

    // Upload source images (skip if product already has them)
    if (product.sourceImages.length > 0) {
      const existingSrcCount = isExisting
        ? (await db
            .select({ id: schema.productSourceImages.id })
            .from(schema.productSourceImages)
            .where(eq(schema.productSourceImages.productId, productId))
            .limit(1)
          ).length
        : 0;

      if (existingSrcCount > 0) {
        console.log(`  ⏭ Source images already imported`);
      } else {
        console.log(`  📷 Uploading ${product.sourceImages.length} source images...`);

      await pMap(
        product.sourceImages,
        async (imgPath, idx) => {
          try {
            const fileName = path.basename(imgPath);
            const key = `source/${userId}/${productId}/${fileName}`;
            const url = await uploadToR2(s3, imgPath, key);

            const fileStats = fs.statSync(imgPath);
            await db.insert(schema.productSourceImages).values({
              id: nanoid(),
              productId,
              url,
              fileName,
              fileSize: fileStats.size,
              mimeType: imgPath.toLowerCase().endsWith(".png")
                ? "image/png"
                : "image/jpeg",
              sortOrder: idx,
              createdAt: new Date(),
            });

            stats.sourceImagesUploaded++;
          } catch (err) {
            console.error(`    ❌ Failed source: ${path.basename(imgPath)} - ${err}`);
            stats.errors++;
          }
        },
        5
      );
      }
    }

    // Upload generated images per batch — skip batches already in DB
    if (product.generatedBatches.length > 0) {
      // Query existing batch numbers for this product to avoid duplicates
      const existingGenImages = await db
        .select({ batchNumber: schema.productGeneratedImages.batchNumber })
        .from(schema.productGeneratedImages)
        .where(eq(schema.productGeneratedImages.productId, productId));
      const existingBatchNums = new Set(
        existingGenImages.map((r) => r.batchNumber).filter((n): n is number => n !== null)
      );

      for (const batch of product.generatedBatches) {
        if (existingBatchNums.has(batch.batchNumber)) {
          console.log(
            `  ⏭ batch_${String(batch.batchNumber).padStart(2, "0")}: ${batch.images.length} images already imported`
          );
          continue;
        }

        console.log(
          `  🖼 Uploading batch_${String(batch.batchNumber).padStart(2, "0")}: ${batch.images.length} images...`
        );

      await pMap(
        batch.images,
        async (imgPath, idx) => {
          try {
            const fileName = path.basename(imgPath);
            const key = `generated/${userId}/${productId}/batch_${String(batch.batchNumber).padStart(2, "0")}/${fileName}`;
            const url = await uploadToR2(s3, imgPath, key);

            const fileStats = fs.statSync(imgPath);
            await db.insert(schema.productGeneratedImages).values({
              id: nanoid(),
              productId,
              url,
              fileName,
              fileSize: fileStats.size,
              sortOrder: idx,
              batchNumber: batch.batchNumber,
              reviewStatus: "pending",
              createdAt: new Date(),
            });

            stats.generatedImagesUploaded++;
          } catch (err) {
            console.error(`    ❌ Failed generated: ${path.basename(imgPath)} - ${err}`);
            stats.errors++;
          }
        },
        5
      );
      }
    }
  }

  // Save metadata for future runs
  saveMetadata(env, userId, productIds, modelIds);

  return { stats, productIds };
}

// --------------- Main ---------------

async function main() {
  const { userId, env, baseDir, dryRun, batchFilter, productFilter } = parseArgs();

  console.log("🚀 Legacy Image Import Script");
  console.log(`  Environment:    ${env}`);
  console.log(`  User ID:        ${userId}`);
  console.log(`  Base Dir:       ${baseDir}`);
  console.log(`  Dry Run:        ${dryRun}`);
  console.log(`  Batch Filter:   ${batchFilter || "(all)"}`);
  console.log(`  Product Filter: ${productFilter ? [...productFilter].join(", ") : "(all)"}`);

  // Load existing metadata for re-runs
  const metadata = loadMetadata(env, userId);
  if (metadata) {
    console.log(`\n📋 Loaded existing metadata: ${Object.keys(metadata.products).length} products`);
  }
  const seededModelIds = getSeededModelIds(userId);
  if (Object.keys(seededModelIds).length > 0) {
    console.log(`  🔗 Loaded fixed model ID mappings: ${Object.keys(seededModelIds).length}`);
  }

  // Scan directory
  console.log("\n📂 Scanning directory structure...");
  const products = scanDirectory(baseDir, batchFilter, productFilter);
  console.log(`  Found ${products.length} products`);

  if (products.length === 0) {
    console.log("No products found. Exiting.");
    process.exit(0);
  }

  // Dry-run mode
  if (dryRun) {
    const modelsDir = path.join(path.resolve(baseDir), "models");
    printDryRun(products, fs.existsSync(modelsDir) ? modelsDir : null);
    process.exit(0);
  }

  // Setup DB and R2
  const { db, sql } = createDb();
  const s3 = createS3Client();

  // Validate userId exists
  const userExists = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (userExists.length === 0) {
    console.error(`\n❌ Error: User ID "${userId}" not found in database`);
    await sql.end();
    process.exit(1);
  }

  console.log(`  ✅ User verified: ${userExists[0].id}`);

  // Import customer models first
  console.log("\n🧑‍🎤 Importing customer models...");
  const { modelIds, created: modelsCreated, skipped: modelsSkipped } = await importCustomerModels(
    baseDir,
    userId,
    db,
    s3,
    {
      ...(metadata?.models || {}),
      ...seededModelIds,
    },
  );
  console.log(`  Models created: ${modelsCreated}, skipped: ${modelsSkipped}`);

  // Import products
  const { stats, productIds } = await importProducts(products, userId, env, db, s3, metadata, modelIds);
  stats.modelsCreated = modelsCreated;
  stats.modelsSkipped = modelsSkipped;

  // Final report
  console.log("\n========== IMPORT COMPLETE ==========");
  console.log(`Models created:         ${stats.modelsCreated}`);
  console.log(`Models skipped:         ${stats.modelsSkipped}`);
  console.log(`Products created:       ${stats.productsCreated}`);
  console.log(`Products skipped:       ${stats.productsSkipped}`);
  console.log(`Products updated:       ${stats.productsUpdated}`);
  console.log(`Source images uploaded:  ${stats.sourceImagesUploaded}`);
  console.log(`Generated imgs uploaded: ${stats.generatedImagesUploaded}`);
  console.log(`Errors:                 ${stats.errors}`);
  console.log("=====================================");
  console.log(`\n💾 Metadata saved to: .import-cache/${env}_${userId}_products.json`);
  console.log(`   Products tracked: ${Object.keys(productIds).length}`);
  console.log(`   Models tracked:   ${Object.keys(modelIds).length}\n`);

  await sql.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
