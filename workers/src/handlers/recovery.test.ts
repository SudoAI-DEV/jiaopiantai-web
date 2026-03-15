import { after, afterEach, before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { patchDb, type MockStore } from "../test-helpers/mock-db.js";

describe("Recovery - refundCreditsForTask", () => {
  let db: any;
  let closeDb: () => Promise<void>;
  let refundCreditsForTask: (
    referenceId: string,
    referenceType: string,
    reason: string
  ) => Promise<void>;

  before(async () => {
    process.env.DATABASE_URL ||= "postgresql://worker:worker@127.0.0.1:5432/jiaopiantai_test";

    const dbModule = await import("../db.js");
    db = dbModule.db;
    closeDb = dbModule.closeDb;

    const recovery = await import("./recovery.js");
    refundCreditsForTask = recovery.refundCreditsForTask;
  });

  afterEach(() => {
    mock.restoreAll();
  });

  after(async () => {
    await closeDb();
  });

  it("refunds credits and marks related processing tasks and product as failed", async () => {
    const createdAt = new Date("2026-03-15T14:00:00.000Z");
    const store: MockStore = {
      products: [
        {
          id: "prod_refund",
          userId: "user_refund",
          name: "Refund Product",
          category: "clothing",
          status: "submitted",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      product_source_images: [],
      ai_generation_tasks: [
        {
          id: "ai_processing",
          productId: "prod_refund",
          status: "processing",
          targetCount: 2,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: "ai_done",
          productId: "prod_refund",
          status: "completed",
          targetCount: 2,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      task_queue: [],
      product_generated_images: [],
      user_profiles: [
        {
          id: "profile_refund",
          userId: "user_refund",
          creditsBalance: 3,
          creditsFrozen: 1,
          creditsTotalSpent: 0,
          updatedAt: createdAt,
        },
      ],
      credit_transactions: [],
    };

    patchDb(db, store);

    await refundCreditsForTask("prod_refund", "product", "worker permanent failure");

    assert.equal(store.user_profiles[0].creditsBalance, 4);
    assert.equal(store.user_profiles[0].creditsFrozen, 0);
    assert.equal(store.products[0].status, "failed");
    assert.equal(store.ai_generation_tasks[0].status, "failed");
    assert.equal(store.ai_generation_tasks[0].errorMessage, "worker permanent failure");
    assert.equal(store.ai_generation_tasks[1].status, "completed");
    assert.equal(store.credit_transactions.length, 1);
    assert.equal(store.credit_transactions[0].type, "refund");
    assert.equal(store.credit_transactions[0].amount, 1);
  });

  it("ignores non-product reference types", async () => {
    const store: MockStore = {
      products: [],
      product_source_images: [],
      ai_generation_tasks: [],
      task_queue: [],
      product_generated_images: [],
      user_profiles: [],
      credit_transactions: [],
    };

    patchDb(db, store);

    await refundCreditsForTask("other_ref", "other_type", "ignored");

    assert.equal(store.credit_transactions.length, 0);
  });
});
