import { after, afterEach, before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { patchDb, type MockStore } from "../test-helpers/mock-db.js";

describe("Credit flow", () => {
  let appDb: any;
  let closeAppDb: (() => Promise<void>) | null = null;
  let workerDb: any;
  let closeWorkerDb: () => Promise<void>;
  let submitProductToQueue: (params: {
    productId: string;
    userId: string;
    generationConfig?: any;
  }) => Promise<any>;
  let cancelPendingProductTask: (params: {
    productId: string;
    userId: string;
  }) => Promise<any>;
  let handleImageGeneration: (payload: any) => Promise<any>;
  let setGeminiClientFactoryForTests: (factory: (() => Promise<any>) | null) => void;
  let setTaskLifecycleDbForTests: (nextDb: any | null) => void;
  let setUploadToR2ForTests: (
    factory: ((buffer: Buffer, key: string, mimeType: string) => Promise<string>) | null
  ) => void;

  before(async () => {
    process.env.DATABASE_URL ||= "postgresql://worker:worker@127.0.0.1:5432/jiaopiantai_test";

    const appDbModule: any = await import("../../../src/lib/db/index.ts");
    appDb = appDbModule.db;
    closeAppDb =
      typeof appDbModule.closeDb === "function" ? appDbModule.closeDb : null;

    const lifecycleModule = await import("../../../src/lib/ai-task-lifecycle.ts");
    submitProductToQueue = lifecycleModule.submitProductToQueue;
    cancelPendingProductTask = lifecycleModule.cancelPendingProductTask;
    setTaskLifecycleDbForTests = lifecycleModule.setTaskLifecycleDbForTests;

    const workerDbModule = await import("../db.js");
    workerDb = workerDbModule.db;
    closeWorkerDb = workerDbModule.closeDb;

    const imageModule = await import("./image-generation.js");
    handleImageGeneration = imageModule.handleImageGeneration;
    setUploadToR2ForTests = imageModule.setUploadToR2ForTests;

    const geminiModule = await import("../lib/gemini.js");
    setGeminiClientFactoryForTests = geminiModule.setGeminiClientFactoryForTests;
  });

  afterEach(() => {
    mock.restoreAll();
    setTaskLifecycleDbForTests(null);
    setGeminiClientFactoryForTests(null);
    setUploadToR2ForTests(null);
  });

  after(async () => {
    if (closeAppDb) {
      await closeAppDb();
    }
    await closeWorkerDb();
  });

  it("freezes credits on submit and settles them after generation completes", async () => {
    const createdAt = new Date("2026-03-15T16:00:00.000Z");
    const store: MockStore = {
      products: [
        {
          id: "prod_credit_settle",
          userId: "user_credit",
          name: "Credit Settle Product",
          category: "clothing",
          status: "draft",
          shootingRequirements: "自然街拍",
          stylePreference: "法式",
          specialNotes: "保留版型",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      product_source_images: [
        {
          id: "src_credit_1",
          productId: "prod_credit_settle",
          url: "https://assets.example.com/credit-1.jpg",
          createdAt,
        },
      ],
      ai_generation_tasks: [],
      task_queue: [],
      product_generated_images: [],
      customer_models: [
        {
          id: "model_credit_default",
          userId: "user_credit",
          name: "Default Credit Model",
          description: "默认模特",
          imageUrl: "https://assets.example.com/models/credit-default.png",
          isActive: true,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      user_profiles: [
        {
          id: "user_credit",
          userId: "user_credit",
          creditsBalance: 5,
          creditsFrozen: 0,
          creditsTotalSpent: 0,
          updatedAt: createdAt,
        },
      ],
      credit_transactions: [],
    };

    patchDb(appDb, store);
    patchDb(workerDb, store);
    setTaskLifecycleDbForTests(appDb);

    const tempDir = await mkdtemp(join(tmpdir(), "credit-flow-settle-"));
    const sourceImagePath = join(tempDir, "front.jpg");
    await writeFile(sourceImagePath, Buffer.from("source-image"));

    setGeminiClientFactoryForTests(async () => ({
      models: {
        async generateContent() {
          return {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: "image/png",
                        data: Buffer.from("generated-image").toString("base64"),
                      },
                    },
                  ],
                },
              },
            ],
          };
        },
      },
    }));
    setUploadToR2ForTests(async () => "https://cdn.example.com/credit-settle.png");

    try {
      const submission = await submitProductToQueue({
        productId: "prod_credit_settle",
        userId: "user_credit",
      });

      assert.equal(submission.productStatus, "submitted");
      assert.equal(submission.modelId, "model_credit_default");
      assert.equal(store.user_profiles[0].creditsBalance, 4);
      assert.equal(store.user_profiles[0].creditsFrozen, 1);
      assert.equal(store.products[0].modelId, "model_credit_default");
      assert.equal(store.credit_transactions.length, 1);
      assert.equal(store.credit_transactions[0].type, "submission");
      assert.equal(store.ai_generation_tasks.length, 1);
      assert.equal(store.task_queue.length, 1);

      const aiTaskId = store.ai_generation_tasks[0].id;
      const result = await handleImageGeneration({
        productId: "prod_credit_settle",
        aiGenerationTaskId: aiTaskId,
        sourceImageUrls: [sourceImagePath],
        styleAnalysis: null,
        productInfo: {
          name: "Credit Settle Product",
          category: "clothing",
          shootingRequirements: "自然街拍",
          stylePreference: "法式",
          specialNotes: "保留版型",
        },
        targetCount: 1,
      });

      assert.equal(result.generatedCount, 1);
      assert.equal(store.user_profiles[0].creditsBalance, 4);
      assert.equal(store.user_profiles[0].creditsFrozen, 0);
      assert.equal(store.user_profiles[0].creditsTotalSpent, 1);
      assert.equal(store.credit_transactions.length, 2);
      assert.deepEqual(
        store.credit_transactions.map((txn) => txn.type),
        ["submission", "settlement"]
      );
      assert.equal(store.product_generated_images.length, 1);
      assert.equal(store.products[0].status, "reviewing");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("freezes credits on submit and refunds them when the pending task is cancelled", async () => {
    const createdAt = new Date("2026-03-15T17:00:00.000Z");
    const store: MockStore = {
      products: [
        {
          id: "prod_credit_refund",
          userId: "user_refund",
          name: "Credit Refund Product",
          category: "clothing",
          status: "draft",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      product_source_images: [
        {
          id: "src_credit_refund_1",
          productId: "prod_credit_refund",
          url: "https://assets.example.com/refund-1.jpg",
          createdAt,
        },
      ],
      ai_generation_tasks: [],
      task_queue: [],
      product_generated_images: [],
      customer_models: [
        {
          id: "model_refund_default",
          userId: "user_refund",
          name: "Refund Model",
          description: "退款测试模特",
          imageUrl: "https://assets.example.com/models/refund-default.png",
          isActive: true,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      user_profiles: [
        {
          id: "user_refund",
          userId: "user_refund",
          creditsBalance: 5,
          creditsFrozen: 0,
          creditsTotalSpent: 0,
          updatedAt: createdAt,
        },
      ],
      credit_transactions: [],
    };

    patchDb(appDb, store);
    patchDb(workerDb, store);
    setTaskLifecycleDbForTests(appDb);

    await submitProductToQueue({
      productId: "prod_credit_refund",
      userId: "user_refund",
    });

    assert.equal(store.user_profiles[0].creditsBalance, 4);
    assert.equal(store.user_profiles[0].creditsFrozen, 1);
    assert.equal(store.credit_transactions.length, 1);
    assert.equal(store.credit_transactions[0].type, "submission");

    const cancelled = await cancelPendingProductTask({
      productId: "prod_credit_refund",
      userId: "user_refund",
    });

    assert.equal(cancelled.productStatus, "cancelled");
    assert.equal(store.user_profiles[0].creditsBalance, 5);
    assert.equal(store.user_profiles[0].creditsFrozen, 0);
    assert.equal(store.user_profiles[0].creditsTotalSpent, 0);
    assert.equal(store.ai_generation_tasks[0].status, "cancelled");
    assert.equal(store.task_queue[0].status, "cancelled");
    assert.equal(store.products[0].status, "cancelled");
    assert.deepEqual(
      store.credit_transactions.map((txn) => txn.type),
      ["submission", "refund"]
    );
  });

  it("binds a random active customer model only when the product has no model", async () => {
    const createdAt = new Date("2026-03-15T18:00:00.000Z");
    const store: MockStore = {
      products: [
        {
          id: "prod_bind_model",
          userId: "user_bind",
          name: "Bind Model Product",
          category: "clothing",
          status: "draft",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      product_source_images: [
        {
          id: "src_bind_model_1",
          productId: "prod_bind_model",
          url: "https://assets.example.com/bind-1.jpg",
          createdAt,
        },
      ],
      ai_generation_tasks: [],
      task_queue: [],
      product_generated_images: [],
      customer_models: [
        {
          id: "model_bind_a",
          userId: "user_bind",
          name: "Model A",
          description: "A",
          imageUrl: "https://assets.example.com/models/a.png",
          isActive: true,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: "model_bind_b",
          userId: "user_bind",
          name: "Model B",
          description: "B",
          imageUrl: "https://assets.example.com/models/b.png",
          isActive: true,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      user_profiles: [
        {
          id: "profile_bind",
          userId: "user_bind",
          creditsBalance: 5,
          creditsFrozen: 0,
          creditsTotalSpent: 0,
          updatedAt: createdAt,
        },
      ],
      credit_transactions: [],
    };

    patchDb(appDb, store);
    setTaskLifecycleDbForTests(appDb);
    mock.method(Math, "random", () => 0.9);

    const submission = await submitProductToQueue({
      productId: "prod_bind_model",
      userId: "user_bind",
    });

    assert.equal(submission.modelId, "model_bind_b");
    assert.equal(store.products[0].modelId, "model_bind_b");
  });

  it("reuses the bound product model instead of picking a new one", async () => {
    const createdAt = new Date("2026-03-15T19:00:00.000Z");
    const store: MockStore = {
      products: [
        {
          id: "prod_reuse_model",
          userId: "user_reuse",
          modelId: "model_reuse_bound",
          name: "Reuse Model Product",
          category: "clothing",
          status: "draft",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      product_source_images: [
        {
          id: "src_reuse_model_1",
          productId: "prod_reuse_model",
          url: "https://assets.example.com/reuse-1.jpg",
          createdAt,
        },
      ],
      ai_generation_tasks: [],
      task_queue: [],
      product_generated_images: [],
      customer_models: [
        {
          id: "model_reuse_bound",
          userId: "user_reuse",
          name: "Bound Model",
          description: "Bound",
          imageUrl: "https://assets.example.com/models/bound.png",
          isActive: false,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: "model_reuse_other",
          userId: "user_reuse",
          name: "Other Model",
          description: "Other",
          imageUrl: "https://assets.example.com/models/other.png",
          isActive: true,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      user_profiles: [
        {
          id: "profile_reuse",
          userId: "user_reuse",
          creditsBalance: 5,
          creditsFrozen: 0,
          creditsTotalSpent: 0,
          updatedAt: createdAt,
        },
      ],
      credit_transactions: [],
    };

    patchDb(appDb, store);
    setTaskLifecycleDbForTests(appDb);
    mock.method(Math, "random", () => 0);

    const submission = await submitProductToQueue({
      productId: "prod_reuse_model",
      userId: "user_reuse",
    });

    assert.equal(submission.modelId, "model_reuse_bound");
    assert.equal(store.products[0].modelId, "model_reuse_bound");
  });

  it("fails submit when the customer has no active model to bind", async () => {
    const createdAt = new Date("2026-03-15T20:00:00.000Z");
    const store: MockStore = {
      products: [
        {
          id: "prod_no_model",
          userId: "user_no_model",
          name: "No Model Product",
          category: "clothing",
          status: "draft",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      product_source_images: [
        {
          id: "src_no_model_1",
          productId: "prod_no_model",
          url: "https://assets.example.com/no-model-1.jpg",
          createdAt,
        },
      ],
      ai_generation_tasks: [],
      task_queue: [],
      product_generated_images: [],
      customer_models: [],
      user_profiles: [
        {
          id: "profile_no_model",
          userId: "user_no_model",
          creditsBalance: 5,
          creditsFrozen: 0,
          creditsTotalSpent: 0,
          updatedAt: createdAt,
        },
      ],
      credit_transactions: [],
    };

    patchDb(appDb, store);
    setTaskLifecycleDbForTests(appDb);

    await assert.rejects(
      () =>
        submitProductToQueue({
          productId: "prod_no_model",
          userId: "user_no_model",
        }),
      /Please upload at least one active model/
    );
  });

  it("fails submit when the bound model belongs to another customer", async () => {
    const createdAt = new Date("2026-03-15T21:00:00.000Z");
    const store: MockStore = {
      products: [
        {
          id: "prod_foreign_model",
          userId: "user_owner",
          modelId: "model_foreign",
          name: "Foreign Model Product",
          category: "clothing",
          status: "draft",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      product_source_images: [
        {
          id: "src_foreign_model_1",
          productId: "prod_foreign_model",
          url: "https://assets.example.com/foreign-model-1.jpg",
          createdAt,
        },
      ],
      ai_generation_tasks: [],
      task_queue: [],
      product_generated_images: [],
      customer_models: [
        {
          id: "model_foreign",
          userId: "another_user",
          name: "Foreign Model",
          description: "Foreign",
          imageUrl: "https://assets.example.com/models/foreign.png",
          isActive: true,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      user_profiles: [
        {
          id: "profile_owner",
          userId: "user_owner",
          creditsBalance: 5,
          creditsFrozen: 0,
          creditsTotalSpent: 0,
          updatedAt: createdAt,
        },
      ],
      credit_transactions: [],
    };

    patchDb(appDb, store);
    setTaskLifecycleDbForTests(appDb);

    await assert.rejects(
      () =>
        submitProductToQueue({
          productId: "prod_foreign_model",
          userId: "user_owner",
        }),
      /Bound model does not belong to current customer/
    );
  });
});
