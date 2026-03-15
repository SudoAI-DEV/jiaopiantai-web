import { after, afterEach, before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ImageModel, ModelMessage } from "ai";
import { patchDb, type MockStore } from "../test-helpers/mock-db.js";

function buildClothingAnalysis(reference: string) {
  return {
    selectedSources: [
      {
        reference,
        role: "front_overall" as const,
        note: "正面整体",
      },
    ],
    imageDescriptions: [
      {
        file: reference,
        role: "front_overall",
        description: "连衣裙正面整体图",
        visibleDetails: ["V 领", "腰线", "裙摆"],
      },
    ],
    clothingSummary: {
      category: "dress",
      color: "ivory",
      fabric: "linen",
      silhouette: "A-line",
      length: "midi",
      keyFeatures: ["V 领", "收腰", "褶皱裙摆"],
      frontBackDifferences: "背面有绑带，正面无绑带",
      decorationElements: [],
    },
    mustShowDetails: ["V 领", "腰线", "裙摆褶皱"],
    frontOnlyDetails: ["胸前蕾丝边"],
    backOnlyDetails: ["背部绑带"],
    forbiddenMistakes: ["不要改成短裙", "不要去掉腰线"],
  };
}

function buildScenePlan(params: {
  productId: string;
  aiGenerationTaskId: string;
  sourceImageId: string;
  sourceImageUrl: string;
  selectedModel: {
    id: string;
    name: string;
    description?: string | null;
    imageUrl: string;
  };
  scene?: string;
}) {
  const {
    productId,
    aiGenerationTaskId,
    sourceImageId,
    sourceImageUrl,
    selectedModel,
    scene = "country-garden",
  } = params;

  return {
    metadata: {
      productId,
      aiGenerationTaskId,
      scene,
      sourceImageIds: [sourceImageId],
      sourceImageUrls: [sourceImageUrl],
      sourceImageNotes: ["正面主图"],
      selectedModel,
      batchDiversityContext: {
        siblingsChecked: [],
        avoidRepeating: [],
      },
    },
    clothingDescription: "象牙色亚麻连衣裙，强调腰线与裙摆层次。",
    sceneName: scene,
    scenes: Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      shotName: `scene-${index + 1}`,
      framing: index < 5 ? ("full_body" as const) : ("close_up" as const),
      sceneType: index < 5 ? "hero" : "detail",
      sceneFamily: index < 5 ? "garden" : "detail-wall",
      microLocation: index < 5 ? `path-${index + 1}` : `crop-${index + 1}`,
      diversityReason: `avoid-repeat-${index + 1}`,
      pose: "stand naturally",
      lighting: "soft daylight",
      background: "clean background",
      modelDirection: "look slightly left",
      colorTone: "warm neutral",
      cropFocus: index >= 5 ? "dress detail" : undefined,
      sourceImageIndexes: [1],
      renderGoal: "final" as const,
      requiredDetails: ["腰线", "裙摆"],
      frontRequiredDetails: ["胸前蕾丝边"],
      backOnlyDetails: ["背部绑带"],
      bottomRequiredDetails: ["裙摆褶皱"],
      forbiddenDetails: ["不要改领口"],
      seed: 2000 + index,
      fullPrompt: `Render scene ${index + 1} with clean ecommerce composition.`,
    })),
  };
}

function buildImageGenerationResult(label: string) {
  return {
    images: [
      {
        uint8Array: Buffer.from(label),
        mediaType: "image/png",
      },
    ],
    warnings: [],
    responses: [],
    providerMetadata: {},
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
  } as any;
}

describe("Credit flow", () => {
  let appDb: any;
  let closeAppDb: (() => Promise<void>) | null = null;
  let workerDb: any;
  let closeWorkerDb: () => Promise<void>;
  let submitProductToQueue: (params: {
    productId: string;
    userId: string;
  }) => Promise<any>;
  let cancelPendingProductTask: (params: {
    productId: string;
    userId: string;
  }) => Promise<any>;
  let handleClothingAnalysis: (payload: any) => Promise<any>;
  let handleScenePlanning: (payload: any) => Promise<any>;
  let handleSceneRender: (payload: any) => Promise<any>;
  let resetAiSdkTestHooks: () => void;
  let setStructuredObjectGeneratorForTests: (
    generator:
      | ((args: { messages: ModelMessage[]; schema: unknown }) => Promise<unknown>)
      | null
  ) => void;
  let setImageGenerationForTests: ((generator: ((args: any) => Promise<any>) | null) => void);
  let setTestModels: (params: { textModel?: any; imageModel?: ImageModel | null }) => void;
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

    ({ handleClothingAnalysis } = await import("./clothing-analysis.js"));
    ({ handleScenePlanning } = await import("./scene-planning.js"));
    ({ handleSceneRender, setUploadToR2ForTests } = await import("./scene-render.js"));

    ({
      resetAiSdkTestHooks,
      setImageGenerationForTests,
      setStructuredObjectGeneratorForTests,
      setTestModels,
    } = await import("../lib/ai-sdk.js"));
  });

  afterEach(() => {
    mock.restoreAll();
    setTaskLifecycleDbForTests(null);
    resetAiSdkTestHooks();
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
    const tempDir = await mkdtemp(join(tmpdir(), "credit-flow-settle-"));
    const sourceImagePath = join(tempDir, "front.jpg");
    const modelImagePath = join(tempDir, "model.png");
    await writeFile(sourceImagePath, Buffer.from("source-image"));
    await writeFile(modelImagePath, Buffer.from("model-image"));

    const store: MockStore = {
      products: [
        {
          id: "prod_credit_settle",
          userId: "user_credit",
          name: "Credit Settle Product",
          category: "clothing",
          status: "draft",
          shootingRequirements: "自然街拍",
          selectedSceneId: "country-garden",
          specialNotes: "保留版型",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      product_source_images: [
        {
          id: "src_credit_1",
          productId: "prod_credit_settle",
          url: sourceImagePath,
          fileName: "front.jpg",
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
          imageUrl: modelImagePath,
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
    setTestModels({ imageModel: {} as ImageModel });
    let structuredCall = 0;
    setStructuredObjectGeneratorForTests(async () => {
      structuredCall += 1;
      if (structuredCall === 1) {
        return buildClothingAnalysis("front.jpg");
      }

      return buildScenePlan({
        productId: "prod_credit_settle",
        aiGenerationTaskId: store.ai_generation_tasks[0].id,
        sourceImageId: "src_credit_1",
        sourceImageUrl: sourceImagePath,
        selectedModel: {
          id: "model_credit_default",
          name: "Default Credit Model",
          description: "默认模特",
          imageUrl: modelImagePath,
        },
      });
    });
    setImageGenerationForTests(async (args) => {
      return buildImageGenerationResult(
        `generated-${args.prompt.text.includes("scene 10") ? "10" : "scene"}`
      );
    });
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

      const clothingResult = await handleClothingAnalysis(store.task_queue[0].payload);
      assert.deepEqual(clothingResult.mustShowDetails, ["V 领", "腰线", "裙摆褶皱"]);
      assert.equal(store.task_queue[1].type, "scene_planning");

      const scenePlan = await handleScenePlanning(store.task_queue[1].payload);
      assert.equal(scenePlan.metadata.scene, "country-garden");
      assert.equal(store.task_queue[2].type, "scene_render");

      const result = await handleSceneRender(store.task_queue[2].payload);

      assert.equal(result.generatedCount, 10);
      assert.equal(store.user_profiles[0].creditsBalance, 4);
      assert.equal(store.user_profiles[0].creditsFrozen, 0);
      assert.equal(store.user_profiles[0].creditsTotalSpent, 1);
      assert.equal(store.credit_transactions.length, 2);
      assert.deepEqual(
        store.credit_transactions.map((txn) => txn.type),
        ["submission", "settlement"]
      );
      assert.equal(store.product_generated_images.length, 10);
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
          selectedSceneId: "country-garden",
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
          selectedSceneId: "country-garden",
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
          selectedSceneId: "country-garden",
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
          selectedSceneId: "country-garden",
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
          selectedSceneId: "country-garden",
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
