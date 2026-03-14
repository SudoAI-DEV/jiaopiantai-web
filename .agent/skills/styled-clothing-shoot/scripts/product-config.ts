import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import process from "node:process";

export interface ProductConfig {
  product_code?: string;
  scene?: string;
  model_image?: string;
  selected_images: string[];
  selected_image_notes: string[];
  custom_requirements: string[];
  notes: string[];
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function resolveConfigPath(configPath: string): string {
  return isAbsolute(configPath) ? configPath : join(process.cwd(), configPath);
}

export function loadProductConfig(configPath: string): ProductConfig {
  const resolvedPath = resolveConfigPath(configPath);
  const content = readFileSync(resolvedPath, "utf-8");
  const lines = content.split(/\r?\n/);

  const config: ProductConfig = {
    selected_images: [],
    selected_image_notes: [],
    custom_requirements: [],
    notes: [],
  };

  let currentArrayKey: keyof Pick<
    ProductConfig,
    "selected_images" | "selected_image_notes" | "custom_requirements" | "notes"
  > | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "    ");
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const arrayMatch = line.match(/^\s*-\s+(.*)$/);
    if (arrayMatch && currentArrayKey) {
      config[currentArrayKey].push(stripQuotes(arrayMatch[1]));
      continue;
    }

    currentArrayKey = null;

    const keyMatch = line.match(/^([A-Za-z0-9_]+):(?:\s*(.*))?$/);
    if (!keyMatch) {
      continue;
    }

    const [, rawKey, rawValue = ""] = keyMatch;
    const key = rawKey as keyof ProductConfig;
    const value = rawValue.trim();

    if (
      key === "selected_images" ||
      key === "selected_image_notes" ||
      key === "custom_requirements" ||
      key === "notes"
    ) {
      if (value) {
        config[key].push(stripQuotes(value));
      }
      currentArrayKey = key;
      continue;
    }

    if (key === "product_code" || key === "scene" || key === "model_image") {
      config[key] = stripQuotes(value);
    }
  }

  return config;
}

function resolveConfigRelativePath(configPath: string, value: string): string {
  const resolvedPath = resolveConfigPath(configPath);
  const configDir = dirname(resolvedPath);
  return isAbsolute(value) ? value : join(configDir, value);
}

export function resolveSelectedImagesFromConfig(configPath: string): string[] {
  const resolvedPath = resolveConfigPath(configPath);
  const config = loadProductConfig(resolvedPath);

  return config.selected_images.map((imagePath) =>
    resolveConfigRelativePath(resolvedPath, imagePath)
  );
}

export function resolveSelectedImageNotesFromConfig(configPath: string): string[] {
  const resolvedPath = resolveConfigPath(configPath);
  const config = loadProductConfig(resolvedPath);
  return [...config.selected_image_notes];
}

export function resolveModelImageFromConfig(configPath: string): string | undefined {
  const resolvedPath = resolveConfigPath(configPath);
  const config = loadProductConfig(resolvedPath);
  return config.model_image
    ? resolveConfigRelativePath(resolvedPath, config.model_image)
    : undefined;
}
