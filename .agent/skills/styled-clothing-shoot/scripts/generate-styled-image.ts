#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-net

/**
 * Styled Clothing Shoot — Image Generator
 *
 * Custom image generator that PRESERVES model identity from the reference image.
 * This implementation is self-contained inside the styled-clothing-shoot skill
 * and instructs Gemini to keep the model's face, body type, and overall
 * appearance consistent with the provided model reference photo.
 */

import { Buffer } from "node:buffer";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import process from "node:process";
import {
  createGeminiClient,
  resolveGeminiConfig,
} from "./config.ts";

const ASPECT_RATIO = "3:4"; // Portrait orientation for e-commerce fashion
const DEFAULT_IMAGE_MODEL = "gemini-3-pro-image-preview";
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 3000;

export interface GenerateStyledImageOptions {
  sourceImages: string[];
  sourceImageNotes?: string[];
  modelImage?: string;
  fullPrompt: string;
  resolution?: string;
  outputPath: string;
  quiet?: boolean;
}

type GeminiPart =
  | { text: string }
  | {
      inlineData: {
        mimeType: string;
        data: string;
      };
    };

function logInfo(message: string) {
  console.error(message);
}

function isRetryableUpstreamError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("500 Internal Server Error") ||
    message.includes('"code":500') ||
    message.includes("upstream_error")
  );
}

function resolveRetryConfig() {
  const maxAttempts = Math.max(
    1,
    Number.parseInt(
      Deno.env.get("STYLED_IMAGE_MAX_ATTEMPTS") ||
        process.env.STYLED_IMAGE_MAX_ATTEMPTS ||
        String(DEFAULT_MAX_ATTEMPTS),
      10
    ) || DEFAULT_MAX_ATTEMPTS
  );
  const baseDelayMs = Math.max(
    0,
    Number.parseInt(
      Deno.env.get("STYLED_IMAGE_RETRY_DELAY_MS") ||
        process.env.STYLED_IMAGE_RETRY_DELAY_MS ||
        String(DEFAULT_RETRY_DELAY_MS),
      10
    ) || DEFAULT_RETRY_DELAY_MS
  );
  return { maxAttempts, baseDelayMs };
}

function resolveMimeType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function generateStyledImage(
  options: GenerateStyledImageOptions,
  apiKey?: string,
  baseUrl?: string
): Promise<{ success: boolean; imagePath?: string; error?: string }> {
  const {
    sourceImages,
    sourceImageNotes = [],
    modelImage,
    fullPrompt,
    resolution = "2K",
    outputPath,
    quiet = false,
  } = options;

  const { baseUrl: resolvedBaseUrl } = resolveGeminiConfig({ apiKey, baseUrl });
  const ai = createGeminiClient({ apiKey, baseUrl });
  const { maxAttempts, baseDelayMs } = resolveRetryConfig();
  const imageModel =
    Deno.env.get("GEMINI_IMAGE_MODEL") ||
    process.env.GEMINI_IMAGE_MODEL ||
    DEFAULT_IMAGE_MODEL;

  const parts: GeminiPart[] = [
    {
      text: [
        "【执行原则】优先严格按照当前场景的 full_prompt 出图。",
        "服装源图只用于锁定服装本身的颜色、面料、版型、长度和主要结构。",
        "模特参考图只用于锁定人物身份与整体外形一致性。",
      ].join("\n"),
    },
    { text: fullPrompt },
  ];

  if (sourceImageNotes.length) {
    const sourceImageSummary = sourceImages
      .map((_, index) => {
        const note = sourceImageNotes[index];
        return `${index + 1}. ${note || "未标注，默认用于服装结构锁定。"}`;
      })
      .join("\n");
    parts.push({
      text: [
        "【产品源图对应关系】以下说明仅用于帮助理解当前提供的服装源图：",
        sourceImageSummary,
        "若某张图被标记为正面、背面、平铺或补充细节，请按该角色理解服装结构。",
      ].join("\n"),
    });
  }

  parts.push({
    text: [
      "【服装一致性】服装结构以当前场景的提示词和源图为准，不要把真实版型替换成常见款式。",
      "若当前镜头只提供了部分源图，请优先围绕这些源图里能确认的服装信息出图，不要随意补出明显的新结构。",
    ].join("\n"),
  });

  // ── Model reference image (IDENTITY PRESERVING) ──
  // Must come before source images so the AI prioritizes the model's appearance.
  if (modelImage) {
    const modelPath = modelImage.startsWith("/")
      ? modelImage
      : join(process.cwd(), modelImage);
    const modelData = readFileSync(modelPath);
    parts.push({
      text: [
        "【指定模特参考图】这是客户指定的模特形象。",
        "最终生成的人物必须与这张参考图中的模特高度一致：",
        "- 保持相同的脸型、五官比例、眉眼关系、鼻唇比例、下颌线",
        "- 保持相同的发型、发色、发质",
        "- 保持相同的体型、身材比例、肤色",
        "- 保持相同的整体气质",
        "- 可根据场景调整表情和状态，但面部身份必须是同一个人",
        "严禁重新设计人脸或生成不同身份的面孔。这是同一个模特的不同场景拍摄。",
      ].join("\n"),
    });
    parts.push({
      inlineData: {
        mimeType: resolveMimeType(modelImage),
        data: modelData.toString("base64"),
      },
    });
  }

  // ── Source clothing images ──
  for (let index = 0; index < sourceImages.length; index++) {
    const imgPath = sourceImages[index];
    const imageNote = sourceImageNotes[index];
    const fullPath = imgPath.startsWith("/")
      ? imgPath
      : join(process.cwd(), imgPath);
    const imageData = readFileSync(fullPath);
    parts.push({
      text: [
        `产品源图 ${index + 1}：这张图只用于锁定需要保留的目标服装本身。必须严格保留这张图里的服装颜色、面料、版型、图案、长度和结构细节。`,
        imageNote ? `图序说明：${imageNote}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    parts.push({
      inlineData: {
        mimeType: resolveMimeType(imgPath),
        data: imageData.toString("base64"),
      },
    });
  }

  const imageSize = resolution || "2K";

  if (!quiet) {
    logInfo(
      `[styled-generate] Generating image with ${sourceImages.length} source + model ref...`
    );
    logInfo(`[styled-generate] Base URL: ${resolvedBaseUrl}`);
    logInfo(`[styled-generate] Model: ${imageModel}`);
    logInfo(`[styled-generate] Resolution: ${imageSize}, Aspect: ${ASPECT_RATIO}`);
    logInfo(`[styled-generate] Output: ${outputPath}`);
  }

  const requestConfig = {
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: { aspectRatio: ASPECT_RATIO, imageSize },
  };

  let response;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: imageModel,
        contents: [{ role: "user", parts }],
        config: requestConfig,
      });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < maxAttempts && isRetryableUpstreamError(error);
      if (!shouldRetry) {
        throw error;
      }

      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      if (!quiet) {
        logInfo(
          `[styled-generate] Upstream 500 on attempt ${attempt}/${maxAttempts}, retrying in ${delayMs}ms...`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (!response) {
    if (lastError instanceof Error) throw lastError;
    throw new Error(`Image generation failed after ${maxAttempts} attempts`);
  }

  const resParts = response.candidates?.[0]?.content?.parts || [];
  let resultImageBase64: string | null = null;
  let resultMimeType = "image/png";

  for (const part of resParts) {
    if (part.inlineData) {
      resultImageBase64 = part.inlineData.data ?? null;
      resultMimeType = part.inlineData.mimeType || "image/png";
    }
  }

  if (!resultImageBase64) {
    return { success: false, error: "No image generated" };
  }

  const imageBuffer = Buffer.from(resultImageBase64, "base64");
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(outputPath, imageBuffer);
  if (!quiet) {
    logInfo(`[styled-generate] Success! Saved to ${outputPath}`);
  }

  return { success: true, imagePath: outputPath };
}
