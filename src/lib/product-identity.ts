export interface SceneTemplateIdentity {
  id: string;
  name: string;
}

export type SceneSelectionResult =
  | {
      ok: true;
      selectedStyleId: string | null;
      sceneName: string;
    }
  | {
      ok: false;
      code: "missing_scene" | "invalid_selected_style_id";
    };

export function normalizeBatchNumber(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? ""), 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function buildGeneratedProductName(params: {
  requestedName?: string | null;
  productNumber: string;
  batchNumber: number;
  sceneName: string;
}) {
  void params.requestedName;
  const sceneName = params.sceneName.trim().replace(/\s+/g, " ").slice(0, 80) || "未命名场景";
  return `${params.productNumber}-第${normalizeBatchNumber(params.batchNumber)}批-${sceneName}`;
}

export function resolveSceneSelection(params: {
  selectedStyleId?: unknown;
  legacyStylePreference?: unknown;
  matchedTemplate?: SceneTemplateIdentity | null;
}): SceneSelectionResult {
  const selectedStyleId =
    typeof params.selectedStyleId === "string" && params.selectedStyleId.trim().length > 0
      ? params.selectedStyleId.trim()
      : null;

  const legacyStylePreference =
    typeof params.legacyStylePreference === "string" &&
    params.legacyStylePreference.trim().length > 0
      ? params.legacyStylePreference.trim()
      : null;

  if (params.matchedTemplate) {
    return {
      ok: true,
      selectedStyleId: params.matchedTemplate.id,
      sceneName: params.matchedTemplate.name.trim(),
    };
  }

  if (selectedStyleId) {
    return {
      ok: false,
      code: "invalid_selected_style_id",
    };
  }

  if (legacyStylePreference) {
    return {
      ok: true,
      selectedStyleId: null,
      sceneName: legacyStylePreference,
    };
  }

  return {
    ok: false,
    code: "missing_scene",
  };
}
