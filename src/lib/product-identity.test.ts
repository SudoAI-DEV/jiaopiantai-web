import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildGeneratedProductName,
  normalizeBatchNumber,
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
});
