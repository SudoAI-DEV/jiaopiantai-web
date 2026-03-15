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
