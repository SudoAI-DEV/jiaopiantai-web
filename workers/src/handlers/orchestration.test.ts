import { after, afterEach, before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ImageModel, ModelMessage } from 'ai';
import { patchDb, type MockStore } from '../test-helpers/mock-db.js';

function buildClothingAnalysis(reference: string) {
  return {
    selectedSources: [
      {
        reference,
        role: 'front_overall' as const,
        note: '正面整体',
      },
    ],
    imageDescriptions: [
      {
        file: reference,
        role: 'front_overall',
        description: '连衣裙正面整体图',
        visibleDetails: ['V 领', '腰线', '裙摆'],
      },
    ],
    clothingSummary: {
      category: 'dress',
      color: 'ivory',
      fabric: 'linen',
      silhouette: 'A-line',
      length: 'midi',
      keyFeatures: ['V 领', '收腰', '褶皱裙摆'],
      frontBackDifferences: '背面有绑带，正面无绑带',
      decorationElements: [
        {
          name: 'lace trim',
          position: 'neckline',
          location: 'front',
          form: 'thin trim',
        },
      ],
    },
    mustShowDetails: ['V 领', '腰线', '裙摆褶皱'],
    frontOnlyDetails: ['胸前蕾丝边'],
    backOnlyDetails: ['背部绑带'],
    forbiddenMistakes: ['不要改成短裙', '不要去掉腰线'],
  };
}

function buildScenePlan(params: {
  productId: string;
  aiGenerationTaskId: string;
  sourceImageId: string;
  sourceImageUrl: string;
  sourceImageNote?: string;
  selectedModel?: {
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
    sourceImageNote = '正面主图',
    selectedModel,
    scene = 'architectural-editorial',
  } = params;

  return {
    metadata: {
      productId,
      aiGenerationTaskId,
      scene,
      sourceImageIds: [sourceImageId],
      sourceImageUrls: [sourceImageUrl],
      sourceImageNotes: [sourceImageNote],
      selectedModel,
      batchDiversityContext: {
        siblingsChecked: [],
        avoidRepeating: [],
      },
    },
    clothingDescription: '象牙色亚麻连衣裙，强调腰线与裙摆层次。',
    sceneName: scene,
    scenes: Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      shotName: `scene-${index + 1}`,
      framing: index < 5 ? ('full_body' as const) : ('close_up' as const),
      sceneType: index < 5 ? 'hero' : 'detail',
      sceneFamily: index < 5 ? 'garden' : 'detail-wall',
      microLocation: index < 5 ? `path-${index + 1}` : `crop-${index + 1}`,
      diversityReason: `avoid-repeat-${index + 1}`,
      pose: 'stand naturally',
      lighting: 'soft daylight',
      background: 'clean background',
      modelDirection: 'look slightly left',
      colorTone: 'warm neutral',
      cropFocus: index >= 5 ? 'dress detail' : undefined,
      sourceImageIndexes: [1],
      renderGoal: 'final' as const,
      requiredDetails: ['腰线', '裙摆'],
      frontRequiredDetails: ['胸前蕾丝边'],
      backOnlyDetails: ['背部绑带'],
      bottomRequiredDetails: ['裙摆褶皱'],
      forbiddenDetails: ['不要改领口'],
      seed: 1000 + index,
      fullPrompt: `Render scene ${index + 1} with clean ecommerce styling.`,
    })),
  };
}

function buildImageGenerationResult(label: string) {
  return {
    images: [
      {
        uint8Array: Buffer.from(label),
        mediaType: 'image/png',
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

describe('AI SDK orchestration handlers', () => {
  let db: any;
  let closeDb: () => Promise<void>;
  let handleClothingAnalysis: (payload: any) => Promise<any>;
  let handleScenePlanning: (payload: any) => Promise<any>;
  let handleSceneRender: (payload: any) => Promise<any>;
  let resetAiSdkTestHooks: () => void;
  let setStructuredObjectGeneratorForTests: (
    generator: ((args: { messages: ModelMessage[]; schema: unknown }) => Promise<unknown>) | null
  ) => void;
  let setImageGenerationForTests: ((generator: ((args: any) => Promise<any>) | null) => void);
  let setTestModels: (params: { textModel?: any; imageModel?: ImageModel | null }) => void;
  let setUploadToR2ForTests: (
    generator: ((buffer: Buffer, key: string, mimeType: string) => Promise<string>) | null
  ) => void;

  before(async () => {
    process.env.DATABASE_URL ||= 'postgresql://worker:worker@127.0.0.1:5432/jiaopiantai_test';

    const dbModule = await import('../db.js');
    db = dbModule.db;
    closeDb = dbModule.closeDb;

    ({ handleClothingAnalysis } = await import('./clothing-analysis.js'));
    ({ handleScenePlanning } = await import('./scene-planning.js'));
    ({ handleSceneRender, setUploadToR2ForTests } = await import('./scene-render.js'));

    ({
      resetAiSdkTestHooks,
      setImageGenerationForTests,
      setStructuredObjectGeneratorForTests,
      setTestModels,
    } = await import('../lib/ai-sdk.js'));
  });

  afterEach(() => {
    mock.restoreAll();
    resetAiSdkTestHooks();
    setUploadToR2ForTests(null);
  });

  after(async () => {
    await closeDb();
  });

  it('reuses structured clothing analysis from payload and enqueues scene planning', async () => {
    const now = new Date('2026-03-15T09:00:00.000Z');
    const store: MockStore = {
      products: [
        {
          id: 'prod_clothing',
          userId: 'user_1',
          name: 'Ivory Dress',
          category: 'dress',
          shootingRequirements: '突出腰线',
          stylePreference: 'architectural-editorial',
          specialNotes: '保留背面绑带',
          status: 'submitted',
          createdAt: now,
          updatedAt: now,
        },
      ],
      product_source_images: [
        {
          id: 'src_clothing',
          productId: 'prod_clothing',
          url: 'https://assets.example.com/ivory-front.jpg',
          fileName: 'ivory-front.jpg',
          analysis: null,
          analyzedAt: null,
          createdAt: now,
        },
      ],
      ai_generation_tasks: [
        {
          id: 'ai_clothing',
          productId: 'prod_clothing',
          status: 'pending',
          targetCount: 10,
          createdAt: now,
          updatedAt: now,
        },
      ],
      task_queue: [],
      product_generated_images: [],
      user_profiles: [],
      credit_transactions: [],
    };

    patchDb(db, store);
    setStructuredObjectGeneratorForTests(async () => {
      throw new Error('payload analysis should bypass model call');
    });

    const existingAnalysis = buildClothingAnalysis('ivory-front.jpg');
    const result = await handleClothingAnalysis({
      productId: 'prod_clothing',
      aiGenerationTaskId: 'ai_clothing',
      clothingAnalysis: existingAnalysis,
    });

    assert.deepEqual(result, existingAnalysis);
    assert.equal(store.products[0].status, 'analyzing');
    assert.equal(store.product_source_images[0].analysis.role, 'front_overall');
    assert.equal(store.task_queue.length, 1);
    assert.equal(store.task_queue[0].type, 'scene_planning');
    assert.deepEqual(store.task_queue[0].payload.clothingAnalysis, existingAnalysis);
  });

  it('builds scene planning with sibling batch diversity context from task history', async () => {
    const now = new Date('2026-03-15T10:00:00.000Z');
    const currentAnalysis = buildClothingAnalysis('hero.jpg');
    const siblingPlanA = buildScenePlan({
      productId: 'prod_sibling_a',
      aiGenerationTaskId: 'ai_sibling_a',
      sourceImageId: 'src_sibling_a',
      sourceImageUrl: 'https://assets.example.com/sibling-a.jpg',
      scene: 'architectural-editorial',
    });
    const siblingPlanB = buildScenePlan({
      productId: 'prod_sibling_b',
      aiGenerationTaskId: 'ai_sibling_b',
      sourceImageId: 'src_sibling_b',
      sourceImageUrl: 'https://assets.example.com/sibling-b.jpg',
      scene: 'architectural-editorial',
    });

    const store: MockStore = {
      products: [
        {
          id: 'prod_scene',
          userId: 'user_scene',
          modelId: 'model_scene',
          name: 'Scene Product',
          category: 'dress',
          shootingRequirements: '卖衣服',
          stylePreference: 'architectural-editorial',
          specialNotes: '不要换领口',
          status: 'submitted',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'prod_sibling_a',
          userId: 'user_scene',
          name: 'Sibling A',
          category: 'dress',
          shootingRequirements: '卖衣服',
          stylePreference: 'architectural-editorial',
          specialNotes: null,
          status: 'reviewing',
          createdAt: new Date('2026-03-14T10:00:00.000Z'),
          updatedAt: new Date('2026-03-14T10:00:00.000Z'),
        },
        {
          id: 'prod_sibling_b',
          userId: 'user_scene',
          name: 'Sibling B',
          category: 'dress',
          shootingRequirements: '卖衣服',
          stylePreference: 'architectural-editorial',
          specialNotes: null,
          status: 'reviewing',
          createdAt: new Date('2026-03-13T10:00:00.000Z'),
          updatedAt: new Date('2026-03-13T10:00:00.000Z'),
        },
      ],
      customer_models: [
        {
          id: 'model_scene',
          userId: 'user_scene',
          name: 'Scene Model',
          description: '高挑短发模特，神态冷静',
          imageUrl: 'https://assets.example.com/models/scene-model.png',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      product_source_images: [
        {
          id: 'src_scene',
          productId: 'prod_scene',
          url: 'https://assets.example.com/hero.jpg',
          fileName: 'hero.jpg',
          analysis: null,
          analyzedAt: null,
          createdAt: now,
        },
      ],
      ai_generation_tasks: [
        {
          id: 'ai_scene',
          productId: 'prod_scene',
          status: 'pending',
          targetCount: 10,
          createdAt: now,
          updatedAt: now,
        },
      ],
      task_queue: [
        {
          id: 'task_clothing_done',
          type: 'clothing_analysis',
          status: 'completed',
          payload: {
            productId: 'prod_scene',
            aiGenerationTaskId: 'ai_scene',
          },
          result: currentAnalysis,
          referenceId: 'prod_scene',
          referenceType: 'product',
          attemptCount: 1,
          maxAttempts: 3,
          createdAt: now,
          completedAt: now,
        },
        {
          id: 'task_sibling_a',
          type: 'scene_planning',
          status: 'completed',
          payload: {
            productId: 'prod_sibling_a',
            aiGenerationTaskId: 'ai_sibling_a',
            scene: 'architectural-editorial',
          },
          result: siblingPlanA,
          referenceId: 'prod_sibling_a',
          referenceType: 'product',
          attemptCount: 1,
          maxAttempts: 3,
          createdAt: new Date('2026-03-14T12:00:00.000Z'),
          completedAt: new Date('2026-03-14T12:00:00.000Z'),
        },
        {
          id: 'task_sibling_b',
          type: 'scene_planning',
          status: 'completed',
          payload: {
            productId: 'prod_sibling_b',
            aiGenerationTaskId: 'ai_sibling_b',
            scene: 'architectural-editorial',
          },
          result: siblingPlanB,
          referenceId: 'prod_sibling_b',
          referenceType: 'product',
          attemptCount: 1,
          maxAttempts: 3,
          createdAt: new Date('2026-03-13T12:00:00.000Z'),
          completedAt: new Date('2026-03-13T12:00:00.000Z'),
        },
      ],
      product_generated_images: [],
      user_profiles: [],
      credit_transactions: [],
    };

    patchDb(db, store);

    let capturedPrompt = '';
    setStructuredObjectGeneratorForTests(async ({ messages }) => {
      const [message] = messages;
      capturedPrompt = typeof message.content === 'string' ? message.content : '';
      const plan = buildScenePlan({
        productId: 'ignored',
        aiGenerationTaskId: 'ignored',
        sourceImageId: 'ignored',
        sourceImageUrl: 'https://assets.example.com/ignored.jpg',
      });
      return {
        ...plan,
        scenes: plan.scenes.map((scene, index) => ({
          ...scene,
          sourceImageIndexes: index === 0 ? [0] : scene.sourceImageIndexes,
        })),
      };
    });

    const result = await handleScenePlanning({
      productId: 'prod_scene',
      aiGenerationTaskId: 'ai_scene',
      scene: 'architectural-editorial',
    });

    assert.equal(result.scenes.length, 10);
    assert.deepEqual(result.metadata.siblingsChecked, undefined);
    assert.deepEqual(result.metadata.batchDiversityContext.siblingsChecked, [
      'task_sibling_a',
      'task_sibling_b',
    ]);
    assert.equal(result.metadata.selectedModel?.id, 'model_scene');
    assert.deepEqual(result.scenes[0].sourceImageIndexes, [1]);
    assert.match(result.metadata.batchDiversityContext.avoidRepeating[0], /garden\/path-1/);
    assert.match(capturedPrompt, /历史 sibling plans 摘要/);
    assert.match(capturedPrompt, /绑定模特：Scene Model/);
    assert.match(capturedPrompt, /高挑短发模特，神态冷静/);
    assert.equal(store.task_queue.at(-1)?.type, 'scene_render');
  });

  it('prefers payload scene over the persisted product scene enum', async () => {
    const now = new Date('2026-03-15T10:30:00.000Z');
    const store: MockStore = {
      products: [
        {
          id: 'prod_scene_enum',
          userId: 'user_scene_enum',
          name: 'Scene Enum Product',
          category: 'dress',
          stylePreference: 'seaside-art',
          selectedStyleId: 'urban-street',
          shootingRequirements: '卖衣服',
          specialNotes: null,
          status: 'submitted',
          createdAt: now,
          updatedAt: now,
        },
      ],
      product_source_images: [
        {
          id: 'src_scene_enum',
          productId: 'prod_scene_enum',
          url: 'https://assets.example.com/scene-enum.jpg',
          fileName: 'scene-enum.jpg',
          analysis: null,
          analyzedAt: null,
          createdAt: now,
        },
      ],
      ai_generation_tasks: [
        {
          id: 'ai_scene_enum',
          productId: 'prod_scene_enum',
          status: 'pending',
          targetCount: 10,
          createdAt: now,
          updatedAt: now,
        },
      ],
      task_queue: [
        {
          id: 'task_clothing_scene_enum',
          type: 'clothing_analysis',
          status: 'completed',
          payload: {
            productId: 'prod_scene_enum',
            aiGenerationTaskId: 'ai_scene_enum',
          },
          result: buildClothingAnalysis('scene-enum.jpg'),
          referenceId: 'prod_scene_enum',
          referenceType: 'product',
          attemptCount: 1,
          maxAttempts: 3,
          createdAt: now,
          completedAt: now,
        },
      ],
      product_generated_images: [],
      user_profiles: [],
      credit_transactions: [],
    };

    patchDb(db, store);

    let capturedPrompt = '';
    setStructuredObjectGeneratorForTests(async ({ messages }) => {
      const [message] = messages;
      capturedPrompt = typeof message.content === 'string' ? message.content : '';
      return buildScenePlan({
        productId: 'prod_scene_enum',
        aiGenerationTaskId: 'ai_scene_enum',
        sourceImageId: 'src_scene_enum',
        sourceImageUrl: 'https://assets.example.com/scene-enum.jpg',
        scene: 'urban-street',
      });
    });

    const result = await handleScenePlanning({
      productId: 'prod_scene_enum',
      aiGenerationTaskId: 'ai_scene_enum',
      scene: 'urban-street',
    });

    assert.equal(result.metadata.scene, 'urban-street');
    assert.match(capturedPrompt, /目标场景ID：urban-street/);
    assert.match(capturedPrompt, /目标场景：都市街拍/);
    assert.match(capturedPrompt, /场景参考模板：scene-d-urban-street/);
  });

  it('fails fast when no valid scene enum exists', async () => {
    const now = new Date('2026-03-15T10:45:00.000Z');
    const store: MockStore = {
      products: [
        {
          id: 'prod_scene_legacy',
          userId: 'user_scene_legacy',
          name: 'Legacy Scene Product',
          category: '海边艺术',
          stylePreference: '产品 2',
          selectedStyleId: null,
          shootingRequirements: '卖衣服',
          specialNotes: null,
          status: 'submitted',
          createdAt: now,
          updatedAt: now,
        },
      ],
      product_source_images: [
        {
          id: 'src_scene_legacy',
          productId: 'prod_scene_legacy',
          url: 'https://assets.example.com/scene-legacy.jpg',
          fileName: 'scene-legacy.jpg',
          analysis: null,
          analyzedAt: null,
          createdAt: now,
        },
      ],
      ai_generation_tasks: [
        {
          id: 'ai_scene_legacy',
          productId: 'prod_scene_legacy',
          status: 'pending',
          targetCount: 10,
          createdAt: now,
          updatedAt: now,
        },
      ],
      task_queue: [
        {
          id: 'task_clothing_scene_legacy',
          type: 'clothing_analysis',
          status: 'completed',
          payload: {
            productId: 'prod_scene_legacy',
            aiGenerationTaskId: 'ai_scene_legacy',
          },
          result: buildClothingAnalysis('scene-legacy.jpg'),
          referenceId: 'prod_scene_legacy',
          referenceType: 'product',
          attemptCount: 1,
          maxAttempts: 3,
          createdAt: now,
          completedAt: now,
        },
      ],
      product_generated_images: [],
      user_profiles: [],
      credit_transactions: [],
    };

    patchDb(db, store);

    await assert.rejects(
      () =>
        handleScenePlanning({
          productId: 'prod_scene_legacy',
          aiGenerationTaskId: 'ai_scene_legacy',
        }),
      /Missing valid scene enum/
    );
  });

  it('loads scene plan from task results and completes scene render with settlement', async () => {
    const now = new Date('2026-03-15T11:00:00.000Z');
    const tempDir = await mkdtemp(join(tmpdir(), 'scene-render-success-'));
    const sourceImagePath = join(tempDir, 'source.jpg');
    const modelImagePath = join(tempDir, 'model.png');
    await writeFile(sourceImagePath, Buffer.from('source-image'));
    await writeFile(modelImagePath, Buffer.from('model-image'));

    const scenePlan = buildScenePlan({
      productId: 'prod_render',
      aiGenerationTaskId: 'ai_render',
      sourceImageId: 'src_render',
      sourceImageUrl: sourceImagePath,
      sourceImageNote: '锁定裙摆',
      scene: 'architectural-editorial',
    });

    const store: MockStore = {
      products: [
        {
          id: 'prod_render',
          userId: 'user_render',
          modelId: 'model_render',
          name: 'Render Product',
          category: 'dress',
          shootingRequirements: '突出裙摆',
          stylePreference: 'architectural-editorial',
          specialNotes: '模特保持一致',
          status: 'submitted',
          createdAt: now,
          updatedAt: now,
        },
      ],
      customer_models: [
        {
          id: 'model_render',
          userId: 'user_render',
          name: 'Render Model',
          description: '长发模特，气质干净，站姿稳定',
          imageUrl: modelImagePath,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      product_source_images: [
        {
          id: 'src_render',
          productId: 'prod_render',
          url: sourceImagePath,
          fileName: 'source.jpg',
          analysis: null,
          analyzedAt: null,
          createdAt: now,
        },
      ],
      ai_generation_tasks: [
        {
          id: 'ai_render',
          productId: 'prod_render',
          status: 'pending',
          targetCount: 10,
          completedCount: 0,
          resultCount: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
      task_queue: [
        {
          id: 'task_clothing_render',
          type: 'clothing_analysis',
          status: 'completed',
          payload: {
            productId: 'prod_render',
            aiGenerationTaskId: 'ai_render',
          },
          result: buildClothingAnalysis('source.jpg'),
          referenceId: 'prod_render',
          referenceType: 'product',
          attemptCount: 1,
          maxAttempts: 3,
          createdAt: now,
          completedAt: now,
        },
        {
          id: 'task_scene_render',
          type: 'scene_planning',
          status: 'completed',
          payload: {
            productId: 'prod_render',
            aiGenerationTaskId: 'ai_render',
            scene: 'architectural-editorial',
          },
          result: scenePlan,
          referenceId: 'prod_render',
          referenceType: 'product',
          attemptCount: 1,
          maxAttempts: 3,
          createdAt: now,
          completedAt: now,
        },
      ],
      product_generated_images: [],
      user_profiles: [
        {
          id: 'profile_render',
          userId: 'user_render',
          creditsBalance: 5,
          creditsFrozen: 1,
          creditsTotalSpent: 0,
          updatedAt: now,
        },
      ],
      credit_transactions: [],
    };

    patchDb(db, store);
    setTestModels({ imageModel: {} as ImageModel });
    let imageCalls = 0;
    let capturedPrompt = '';
    let capturedImageCount = 0;
    setImageGenerationForTests(async (args) => {
      imageCalls += 1;
      capturedPrompt = args.prompt.text;
      capturedImageCount = args.prompt.images.length;
      return buildImageGenerationResult(`image-${imageCalls}`);
    });
    setUploadToR2ForTests(async (_buffer, key) => `https://cdn.example.com/${key}`);

    try {
      const result = await handleSceneRender({
        productId: 'prod_render',
        aiGenerationTaskId: 'ai_render',
      });

      assert.equal(imageCalls, 10);
      assert.equal(result.generatedCount, 10);
      assert.equal(store.product_generated_images.length, 10);
      assert.equal(store.ai_generation_tasks[0].status, 'completed');
      assert.equal(store.products[0].status, 'reviewing');
      assert.equal(store.user_profiles[0].creditsFrozen, 0);
      assert.equal(store.user_profiles[0].creditsTotalSpent, 1);
      assert.equal(store.credit_transactions.length, 1);
      assert.equal(store.credit_transactions[0].type, 'settlement');
      assert.equal(capturedImageCount, 2);
      assert.match(capturedPrompt, /绑定模特：Render Model/);
      assert.match(capturedPrompt, /长发模特，气质干净，站姿稳定/);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('retries only failed scenes on a subsequent scene render run', async () => {
    const now = new Date('2026-03-15T12:00:00.000Z');
    const tempDir = await mkdtemp(join(tmpdir(), 'scene-render-retry-'));
    const sourceImagePath = join(tempDir, 'source.jpg');
    const modelImagePath = join(tempDir, 'model.png');
    await writeFile(sourceImagePath, Buffer.from('source-image'));
    await writeFile(modelImagePath, Buffer.from('model-image'));

    const scenePlan = buildScenePlan({
      productId: 'prod_retry',
      aiGenerationTaskId: 'ai_retry',
      sourceImageId: 'src_retry',
      sourceImageUrl: sourceImagePath,
      selectedModel: {
        id: 'model_retry',
        name: 'Retry Model',
        description: '长发模特，姿态稳定',
        imageUrl: modelImagePath,
      },
      scene: 'architectural-editorial',
    });

    const store: MockStore = {
      products: [
        {
          id: 'prod_retry',
          userId: 'user_retry',
          modelId: 'model_retry',
          name: 'Retry Product',
          category: 'dress',
          shootingRequirements: '突出裙摆',
          stylePreference: 'architectural-editorial',
          specialNotes: null,
          status: 'rendering',
          createdAt: now,
          updatedAt: now,
        },
      ],
      customer_models: [
        {
          id: 'model_retry',
          userId: 'user_retry',
          name: 'Retry Model',
          description: '长发模特，姿态稳定',
          imageUrl: modelImagePath,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      product_source_images: [
        {
          id: 'src_retry',
          productId: 'prod_retry',
          url: sourceImagePath,
          fileName: 'source.jpg',
          analysis: null,
          analyzedAt: null,
          createdAt: now,
        },
      ],
      ai_generation_tasks: [
        {
          id: 'ai_retry',
          productId: 'prod_retry',
          status: 'processing',
          targetCount: 10,
          completedCount: 1,
          resultCount: 1,
          createdAt: now,
          updatedAt: now,
        },
      ],
      task_queue: [
        {
          id: 'task_clothing_retry',
          type: 'clothing_analysis',
          status: 'completed',
          payload: {
            productId: 'prod_retry',
            aiGenerationTaskId: 'ai_retry',
          },
          result: buildClothingAnalysis('source.jpg'),
          referenceId: 'prod_retry',
          referenceType: 'product',
          attemptCount: 1,
          maxAttempts: 3,
          createdAt: now,
          completedAt: now,
        },
        {
          id: 'task_scene_retry',
          type: 'scene_planning',
          status: 'completed',
          payload: {
            productId: 'prod_retry',
            aiGenerationTaskId: 'ai_retry',
            scene: 'architectural-editorial',
          },
          result: scenePlan,
          referenceId: 'prod_retry',
          referenceType: 'product',
          attemptCount: 1,
          maxAttempts: 3,
          createdAt: now,
          completedAt: now,
        },
      ],
      product_generated_images: [
        {
          id: 'existing_scene_1',
          productId: 'prod_retry',
          generationTaskId: 'ai_retry',
          url: 'https://cdn.example.com/existing-scene-1.png',
          thumbnailUrl: 'https://cdn.example.com/existing-scene-1.png',
          sortOrder: 1,
          reviewStatus: 'pending',
          createdAt: now,
        },
      ],
      user_profiles: [
        {
          id: 'profile_retry',
          userId: 'user_retry',
          creditsBalance: 8,
          creditsFrozen: 1,
          creditsTotalSpent: 0,
          updatedAt: now,
        },
      ],
      credit_transactions: [],
    };

    patchDb(db, store);
    setTestModels({ imageModel: {} as ImageModel });
    setUploadToR2ForTests(async (_buffer, key) => `https://cdn.example.com/${key}`);

    let firstRunCalls = 0;
    setImageGenerationForTests(async () => {
      firstRunCalls += 1;
      if (firstRunCalls === 1) {
        throw new Error('temporary scene failure');
      }

      return buildImageGenerationResult(`retry-${firstRunCalls}`);
    });

    try {
      await assert.rejects(
        () =>
          handleSceneRender({
            productId: 'prod_retry',
            aiGenerationTaskId: 'ai_retry',
          }),
        /incomplete/
      );

      assert.equal(store.product_generated_images.length, 9);
      assert.equal(store.ai_generation_tasks[0].status, 'processing');

      let secondRunCalls = 0;
      setImageGenerationForTests(async () => {
        secondRunCalls += 1;
        return buildImageGenerationResult(`second-${secondRunCalls}`);
      });

      const result = await handleSceneRender({
        productId: 'prod_retry',
        aiGenerationTaskId: 'ai_retry',
      });

      assert.equal(secondRunCalls, 1);
      assert.equal(result.generatedCount, 10);
      assert.equal(store.product_generated_images.length, 10);
      assert.equal(store.ai_generation_tasks[0].status, 'completed');
      assert.equal(store.products[0].status, 'reviewing');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
