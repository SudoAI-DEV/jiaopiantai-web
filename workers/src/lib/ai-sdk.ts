import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  Output,
  generateImage,
  generateObject,
  generateText,
  type RepairTextFunction,
  type GenerateImageResult,
  type ImageModel,
  type LanguageModel,
  type ModelMessage,
} from 'ai';

const DEFAULT_TEXT_MODEL = 'gemini-2.5-pro';
const DEFAULT_IMAGE_MODEL = 'gemini-3-pro-image-preview';
const DEFAULT_IMAGE_BASE_URL = 'http://zx2.52youxi.cc:3000';

let analysisProviderSingleton:
  | ReturnType<typeof createGoogleGenerativeAI>
  | null = null;
let imageProviderSingleton:
  | ReturnType<typeof createGoogleGenerativeAI>
  | null = null;
let textModelForTests: LanguageModel | null = null;
let imageModelForTests: ImageModel | null = null;
let structuredObjectGeneratorForTests:
  | ((args: {
      messages: ModelMessage[];
      schema: Parameters<typeof Output.object>[0]['schema'];
    }) => Promise<unknown>)
  | null = null;
let imageGeneratorForTests:
  | ((args: Parameters<typeof generateImage>[0]) => Promise<GenerateImageResult>)
  | null = null;

function normalizeGoogleBaseUrl(baseURL?: string): string | undefined {
  if (!baseURL) {
    return undefined;
  }

  const trimmedBaseUrl = baseURL.trim().replace(/\/+$/, '');
  if (/\/v\d+(?:beta\d*|alpha\d*)?(?:\/.*)?$/i.test(trimmedBaseUrl)) {
    return trimmedBaseUrl;
  }

  return `${trimmedBaseUrl}/v1beta`;
}

export function getGoogleProvider() {
  if (!analysisProviderSingleton) {
    const apiKey = process.env.GEMINI_ANALYSIS_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_ANALYSIS_API_KEY or GEMINI_API_KEY environment variable is required');
    }

    const baseURL = normalizeGoogleBaseUrl(
      process.env.GEMINI_ANALYSIS_BASE_URL
      || (
        process.env.GEMINI_ANALYSIS_API_KEY
          ? undefined
          : process.env.GEMINI_BASE_URL
      )
    );

    analysisProviderSingleton = createGoogleGenerativeAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
  }

  return analysisProviderSingleton;
}

export function getImageProvider() {
  if (!imageProviderSingleton) {
    const apiKey = process.env.GEMINI_IMAGE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_IMAGE_API_KEY or GEMINI_API_KEY environment variable is required');
    }

    const baseURL = normalizeGoogleBaseUrl(
      process.env.GEMINI_IMAGE_BASE_URL
      || process.env.GEMINI_BASE_URL
      || DEFAULT_IMAGE_BASE_URL
    );

    imageProviderSingleton = createGoogleGenerativeAI({
      apiKey,
      baseURL,
    });
  }

  return imageProviderSingleton;
}

export function getTextModel(modelId: string = process.env.GEMINI_TEXT_MODEL || DEFAULT_TEXT_MODEL) {
  if (textModelForTests) {
    return textModelForTests;
  }
  return getGoogleProvider()(modelId);
}

export function getImageModel(
  modelId: string = process.env.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL
) {
  if (imageModelForTests) {
    return imageModelForTests;
  }
  return getImageProvider().image(modelId);
}

export async function runStructuredObjectGeneration<T>({
  messages,
  schema,
  modelId,
  repairText,
}: {
  messages: ModelMessage[];
  schema: Parameters<typeof Output.object>[0]['schema'];
  modelId?: string;
  repairText?: RepairTextFunction;
}): Promise<T> {
  if (structuredObjectGeneratorForTests) {
    return structuredObjectGeneratorForTests({ messages, schema }) as Promise<T>;
  }

  const { object } = await generateObject({
    model: getTextModel(modelId),
    messages,
    schema,
    maxRetries: 2,
    experimental_repairText: repairText,
  });

  return object as T;
}

export async function runImageGeneration(args: Parameters<typeof generateImage>[0]): Promise<GenerateImageResult> {
  if (imageGeneratorForTests) {
    return imageGeneratorForTests(args);
  }

  return generateImage(args);
}

export function setStructuredObjectGeneratorForTests(
  generator:
    | ((args: {
        messages: ModelMessage[];
        schema: Parameters<typeof Output.object>[0]['schema'];
      }) => Promise<unknown>)
    | null
): void {
  structuredObjectGeneratorForTests = generator;
}

export function setImageGenerationForTests(
  generator:
    | ((args: Parameters<typeof generateImage>[0]) => Promise<GenerateImageResult>)
    | null
): void {
  imageGeneratorForTests = generator;
}

export function setTestModels(params: {
  textModel?: LanguageModel | null;
  imageModel?: ImageModel | null;
}): void {
  textModelForTests = params.textModel ?? null;
  imageModelForTests = params.imageModel ?? null;
}

export function resetAiSdkTestHooks(): void {
  analysisProviderSingleton = null;
  imageProviderSingleton = null;
  textModelForTests = null;
  imageModelForTests = null;
  structuredObjectGeneratorForTests = null;
  imageGeneratorForTests = null;
}

export { Output, generateImage, generateText };
