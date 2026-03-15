import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildGeneratedProductName,
  normalizeBatchNumber,
  resolveSceneSelection,
} from "./product-identity.ts";

describe("product identity helpers", () => {
  it("builds a generated product name from product number, batch, and scene", () => {
    const result = buildGeneratedProductName({
      requestedName: "用户手填名称",
      productNumber: "260123",
      batchNumber: 2,
      sceneName: "法式客厅",
    });

    assert.equal(result, "260123-第2批-法式客厅");
  });

  it("defaults batch number to 1 when input is invalid", () => {
    assert.equal(normalizeBatchNumber(undefined), 1);
    assert.equal(normalizeBatchNumber("0"), 1);
    assert.equal(normalizeBatchNumber("-3"), 1);
    assert.equal(normalizeBatchNumber("2"), 2);
  });

  it("resolves a valid selected scene id into readable scene metadata", () => {
    const result = resolveSceneSelection({
      selectedStyleId: "scene_tpl_1",
      legacyStylePreference: "legacy-value",
      matchedTemplate: {
        id: "scene_tpl_1",
        name: "城市街拍",
      },
    });

    assert.deepEqual(result, {
      ok: true,
      selectedStyleId: "scene_tpl_1",
      sceneName: "城市街拍",
    });
  });

  it("rejects an explicit selected style id when no scene matches", () => {
    const result = resolveSceneSelection({
      selectedStyleId: "missing-template",
      matchedTemplate: null,
    });

    assert.deepEqual(result, {
      ok: false,
      code: "invalid_selected_style_id",
    });
  });

  it("falls back to legacy style preference text when no template id is provided", () => {
    const result = resolveSceneSelection({
      legacyStylePreference: "法式田园",
      matchedTemplate: null,
    });

    assert.deepEqual(result, {
      ok: true,
      selectedStyleId: null,
      sceneName: "法式田园",
    });
  });
});
