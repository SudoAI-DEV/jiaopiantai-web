#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-net

/**
 * Styled Clothing Shoot — Render Pipeline
 *
 * Reads a fully self-contained scenes.json and renders images.
 * All paths, prompts, and config come from the JSON — no extra CLI args needed.
 */

import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import process from "node:process";
import { resolveGeminiConfig } from "./config.ts";
import { generateStyledImage } from "./generate-styled-image.ts";
import {
  resolveModelImageFromConfig,
  resolveSelectedImageNotesFromConfig,
  resolveSelectedImagesFromConfig,
} from "./product-config.ts";

function logInfo(msg: string) {
  console.error(msg);
}

const DEFAULT_CONCURRENCY = 10;
const MAX_CONCURRENCY = 10;

interface RenderScene {
  id: number;
  shot_name?: string;
  full_prompt: string;
  source_image_indexes?: number[];
  render_goal?: string;
  required_details?: string[];
  forbidden_details?: string[];
  front_required_details?: string[];
  back_only_details?: string[];
  bottom_required_details?: string[];
}

interface RenderMetadata {
  clothing_images?: string[];
  source_image_notes?: string[];
  product_config?: string;
  model_image?: string;
  output_dir: string;
  resolution?: string;
}

interface RenderScenesFile {
  metadata: RenderMetadata;
  scenes: RenderScene[];
}

function formatConstraintBlock(title: string, values?: string[]): string {
  if (!values?.length) return "";
  return [`【${title}】`, ...values.map((value) => `- ${value}`)].join("\n");
}

function buildScenePrompt(scene: RenderScene): string {
  const blocks = [
    scene.full_prompt.trim(),
    scene.render_goal
      ? `【本次出图目标】${scene.render_goal === "validation"
          ? "当前镜头优先验证服装结构是否正确，先确保关键结构无误，再追求场景氛围。"
          : "当前镜头为正式成片，必须在服装结构正确的前提下完成完整场景表达。"}`
      : "",
    formatConstraintBlock("必须保留的关键细节", scene.required_details),
    formatConstraintBlock("正面必须出现的细节", scene.front_required_details),
    formatConstraintBlock("只允许出现在背面的细节", scene.back_only_details),
    formatConstraintBlock("下装必须保留的细节", scene.bottom_required_details),
    formatConstraintBlock("禁止出现的错误", scene.forbidden_details),
  ].filter(Boolean);

  if (blocks.length === 1) {
    return blocks[0];
  }

  return blocks.join("\n\n");
}

interface PreparedSceneRender {
  outputPath: string;
  scene: RenderScene;
  sceneClothingImages: string[];
  sceneNumber: number;
  sceneSourceImageNotes: string[];
}

function prepareSceneRender(
  scene: RenderScene,
  clothingImages: string[],
  sourceImageNotes: string[],
  outputDir: string
): PreparedSceneRender {
  const sceneNumber = scene.id;
  const sourceImageIndexes = scene.source_image_indexes;
  const hasScopedSourceImages = sourceImageIndexes !== undefined;
  const sceneClothingImages = hasScopedSourceImages
    ? sourceImageIndexes.map((index) => {
        if (!Number.isInteger(index) || index < 1 || index > clothingImages.length) {
          throw new Error(
            `Scene ${sceneNumber} has invalid source_image_indexes entry: ${index}`
          );
        }
        return clothingImages[index - 1];
      })
    : clothingImages;
  const sceneSourceImageNotes = hasScopedSourceImages
    ? sourceImageIndexes.map((index) => sourceImageNotes[index - 1] || "")
    : sourceImageNotes;
  const outputPath = join(outputDir, `scene_${String(sceneNumber).padStart(2, "0")}.png`);

  return {
    outputPath,
    scene,
    sceneClothingImages,
    sceneNumber,
    sceneSourceImageNotes,
  };
}

async function renderPreparedScene(
  preparedScene: PreparedSceneRender,
  modelImage: string | undefined,
  resolution: string,
  apiKey: string,
  baseUrl: string,
  sceneCount: number,
  jsonOutput = false
) {
  const { outputPath, scene, sceneClothingImages, sceneNumber, sceneSourceImageNotes } =
    preparedScene;
  const fullPrompt = buildScenePrompt(scene);

  if (!fullPrompt) {
    throw new Error(`Scene ${sceneNumber} missing 'full_prompt' field`);
  }

  if (!jsonOutput) {
    logInfo(`Generating scene ${sceneNumber}/${sceneCount}: ${scene.shot_name || "unknown"}`);
  }

  await generateStyledImage(
    {
      sourceImages: sceneClothingImages,
      sourceImageNotes: sceneSourceImageNotes,
      modelImage,
      fullPrompt,
      resolution,
      outputPath,
      quiet: jsonOutput,
    },
    apiKey,
    baseUrl
  );

  if (!jsonOutput) {
    logInfo(`  -> Saved to ${outputPath}\n`);
  }

  return outputPath;
}

async function renderWithConcurrency(
  preparedScenes: PreparedSceneRender[],
  concurrency: number,
  modelImage: string | undefined,
  resolution: string,
  apiKey: string,
  baseUrl: string,
  sceneCount: number,
  jsonOutput = false
) {
  const results = new Array<string>(preparedScenes.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= preparedScenes.length) {
        return;
      }

      const outputPath = await renderPreparedScene(
        preparedScenes[currentIndex],
        modelImage,
        resolution,
        apiKey,
        baseUrl,
        sceneCount,
        jsonOutput
      );
      results[currentIndex] = outputPath;
    }
  }

  const workerCount = Math.min(concurrency, preparedScenes.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results.filter(Boolean);
}

async function renderPipeline(
  scenesJson: string,
  sceneIndex?: number,
  jsonOutput = false,
  concurrency = DEFAULT_CONCURRENCY
) {
  const { apiKey, baseUrl } = resolveGeminiConfig();
  if (!jsonOutput) logInfo(`[config] Base URL: ${baseUrl}`);

  // Load scenes.json
  const scenesPath = isAbsolute(scenesJson)
    ? scenesJson
    : join(process.cwd(), scenesJson);
  const data: RenderScenesFile = JSON.parse(readFileSync(scenesPath, "utf-8"));

  // Read everything from metadata
  const meta = data.metadata;
  if (!meta) throw new Error("scenes.json missing 'metadata' block");

  let clothingImages: string[] = meta.clothing_images || [];
  let sourceImageNotes: string[] = meta.source_image_notes || [];
  const productConfig: string | undefined = meta.product_config || undefined;
  let modelImage: string | undefined = meta.model_image || undefined;
  const outputDir: string = meta.output_dir;
  const resolution: string = meta.resolution || "2K";

  if (!clothingImages.length && productConfig) {
    clothingImages = resolveSelectedImagesFromConfig(productConfig);
  }

  if (!sourceImageNotes.length && productConfig) {
    sourceImageNotes = resolveSelectedImageNotesFromConfig(productConfig);
  }

  if (!modelImage && productConfig) {
    modelImage = resolveModelImageFromConfig(productConfig);
  }

  if (!clothingImages.length) throw new Error("metadata.clothing_images is empty");
  if (!outputDir) throw new Error("metadata.output_dir is required");

  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  if (!jsonOutput) {
    logInfo(`[render] Loaded ${data.scenes.length} scenes from ${scenesPath}`);
    logInfo(
      `[render] Clothing images: ${clothingImages.length}, Model: ${modelImage || "none"}`
    );
    if (productConfig) logInfo(`[render] Product config: ${productConfig}`);
    logInfo(`[render] Output: ${outputDir}`);
  }

  // Determine which scenes to render
  let scenesToRender = data.scenes;
  if (sceneIndex !== undefined) {
    const scene = data.scenes.find((candidate) => candidate.id === sceneIndex);
    if (!scene) throw new Error(`Scene ${sceneIndex} not found in scenes.json`);
    scenesToRender = [scene];
    if (!jsonOutput) logInfo(`[render] Rendering single scene: ${sceneIndex}`);
  }

  const preparedScenes = scenesToRender.map((scene) =>
    prepareSceneRender(scene, clothingImages, sourceImageNotes, outputDir)
  );
  const effectiveConcurrency =
    sceneIndex !== undefined
      ? 1
      : Math.max(1, Math.min(concurrency, MAX_CONCURRENCY, preparedScenes.length));

  if (!jsonOutput) {
    logInfo(`[render] Concurrency: ${effectiveConcurrency}`);
  }

  const imagePaths = await renderWithConcurrency(
    preparedScenes,
    effectiveConcurrency,
    modelImage,
    resolution,
    apiKey,
    baseUrl,
    data.scenes.length,
    jsonOutput
  );

  if (!jsonOutput) {
    logInfo("=== Render Complete ===");
    logInfo(`Output: ${outputDir}`);
  }

  return {
    output_dir: outputDir,
    scenes_path: scenesPath,
    image_paths: imagePaths,
    scene_count: scenesToRender.length,
  };
}

function printHelp() {
  console.log(`
Styled Clothing Shoot — Render Pipeline

Renders images from a self-contained scenes.json. The JSON includes all image
paths, output directory, and fully assembled prompts. No extra args needed.

Usage: render.ts -j <scenes.json> [options]

Options:
  -j, --scenes <path>   Path to scenes.json (required — the only required arg)
  --scene <N>            Render only scene N (1-based index)
  --concurrency <N>      Max concurrent scene renders (default: 10, max: 10)
  --json                 Print machine-readable result summary to stdout
  -h, --help             Show this help message

The scenes.json must contain a "metadata" block with:
  - clothing_images: string[]   — paths to clothing source images
  - product_config: string      — optional 配置.yaml path used to resolve selected_images and model_image
  - model_image: string         — optional path to model reference image (falls back to 配置.yaml)
  - output_dir: string          — where to save generated images
  - resolution: string          — "1K" or "2K" (default: "2K")

Each scene must have a "full_prompt" field with the complete, ready-to-send prompt.
Scenes may optionally define "source_image_indexes" as 1-based indexes into
"metadata.clothing_images" to limit each shot to the relevant source subset.

Examples:
  # Render all 10 scenes
  deno run --allow-read --allow-write --allow-env --allow-net render.ts \\
    -j 客户/花姐\\&寅寅/产品\\ 2/海边艺术/2-HA-01/生成/batch_01/scenes.json

  # Re-render only scene 3
  deno run --allow-read --allow-write --allow-env --allow-net render.ts \\
    -j scenes.json --scene 3

  # Render a whole batch with 10 concurrent scenes
  deno run --allow-read --allow-write --allow-env --allow-net render.ts \\
    -j scenes.json --concurrency 10

Environment Variables:
  GEMINI_API_KEY          Optional override for the configured API key
  GEMINI_BASE_URL         Optional override for the configured base URL
  GEMINI_IMAGE_MODEL      Optional image model override
  `);
}

if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  let scenesJson = "";
  let sceneIndex: number | undefined;
  let concurrency = DEFAULT_CONCURRENCY;
  let jsonOutput = false;
  let i = 0;

  while (i < args.length) {
    const arg = args[i];
    if (arg === "--scenes" || arg === "-j") {
      scenesJson = args[++i];
    } else if (arg === "--scene") {
      sceneIndex = parseInt(args[++i], 10);
    } else if (arg === "--concurrency") {
      concurrency = parseInt(args[++i], 10);
    } else if (arg === "--json") {
      jsonOutput = true;
    }
    i++;
  }

  if (!scenesJson) {
    console.error("Error: --scenes/-j is required (path to scenes.json)");
    printHelp();
    process.exit(1);
  }

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    console.error("Error: --concurrency must be a positive integer");
    process.exit(1);
  }

  renderPipeline(scenesJson, sceneIndex, jsonOutput, concurrency)
    .then((result) => {
      if (jsonOutput && result) {
        console.log(JSON.stringify(result, null, 2));
      }
    })
    .catch((err) => {
      console.error("Render error:", err);
      process.exit(1);
    });
}
