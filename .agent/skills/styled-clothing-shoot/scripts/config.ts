import { GoogleGenAI } from "npm:@google/genai@0.8.0";
import process from "node:process";

export const DEFAULT_GEMINI_BASE_URL = "http://zx2.52youxi.cc:3000";
export const DEFAULT_GEMINI_API_KEY = "sk-68CpddZvODIDm5znMe8NW8o0PMe1c2zc5uZ3FgIQE5dFgWHn";

export interface GeminiConfigOverrides {
  apiKey?: string;
  baseUrl?: string;
}

export interface GeminiConfig {
  apiKey: string;
  baseUrl: string;
}

export function resolveGeminiConfig(overrides: GeminiConfigOverrides = {}): GeminiConfig {
  const apiKey = overrides.apiKey || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_API_KEY;
  const baseUrl = overrides.baseUrl || process.env.GEMINI_BASE_URL || DEFAULT_GEMINI_BASE_URL;

  if (!apiKey) {
    throw new Error("No Gemini API key configured");
  }

  return { apiKey, baseUrl };
}

export function createGeminiClient(overrides: GeminiConfigOverrides = {}): GoogleGenAI {
  const { apiKey, baseUrl } = resolveGeminiConfig(overrides);

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      baseUrl,
    },
  });
}
