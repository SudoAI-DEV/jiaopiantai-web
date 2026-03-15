import { z } from 'zod';
import { SCENE_IDS } from './scenes.js';

export const clothingSourceRoleSchema = z.enum([
  'front_overall',
  'back_overall',
  'detail',
  'lower_body',
  'flat_lay',
  'other',
]);

export const decorationElementSchema = z.object({
  name: z.string(),
  position: z.string(),
  location: z.string(),
  form: z.string(),
});

export const clothingAnalysisSchema = z.object({
  selectedSources: z.array(
    z.object({
      reference: z.string(),
      role: clothingSourceRoleSchema,
      note: z.string().optional(),
    })
  ).min(1),
  imageDescriptions: z.array(
    z.object({
      file: z.string(),
      role: z.string(),
      description: z.string(),
      visibleDetails: z.array(z.string()).default([]),
    })
  ).min(1),
  clothingSummary: z.object({
    category: z.string(),
    color: z.string(),
    fabric: z.string(),
    silhouette: z.string(),
    length: z.string(),
    keyFeatures: z.array(z.string()).min(1),
    frontBackDifferences: z.string(),
    decorationElements: z.array(decorationElementSchema).default([]),
  }),
  mustShowDetails: z.array(z.string()).default([]),
  frontOnlyDetails: z.array(z.string()).default([]),
  backOnlyDetails: z.array(z.string()).default([]),
  forbiddenMistakes: z.array(z.string()).default([]),
});

const sceneSchema = z.object({
  id: z.number().int().min(1).max(10),
  shotName: z.string(),
  framing: z.enum(['full_body', 'close_up']),
  sceneType: z.string(),
  sceneFamily: z.string(),
  microLocation: z.string(),
  diversityReason: z.string(),
  pose: z.string(),
  lighting: z.string(),
  background: z.string(),
  modelDirection: z.string(),
  colorTone: z.string(),
  cropFocus: z.string().optional(),
  sourceImageIndexes: z.array(z.number().int().min(1)).min(1),
  renderGoal: z.enum(['validation', 'final']),
  requiredDetails: z.array(z.string()).default([]),
  frontRequiredDetails: z.array(z.string()).default([]),
  backOnlyDetails: z.array(z.string()).default([]),
  bottomRequiredDetails: z.array(z.string()).default([]),
  forbiddenDetails: z.array(z.string()).default([]),
  seed: z.number().int().min(1),
  fullPrompt: z.string(),
});

export const scenePlanSchema = z.object({
  metadata: z.object({
    productId: z.string(),
    aiGenerationTaskId: z.string(),
    scene: z.enum(SCENE_IDS),
    sourceImageIds: z.array(z.string()).min(1),
    sourceImageUrls: z.array(z.string()).min(1),
    sourceImageNotes: z.array(z.string()).default([]),
    modelImageUrl: z.string().optional(),
    selectedModel: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable().optional(),
      imageUrl: z.string(),
    }).optional(),
    batchDiversityContext: z.object({
      siblingsChecked: z.array(z.string()).default([]),
      avoidRepeating: z.array(z.string()).default([]),
    }),
  }),
  clothingDescription: z.string(),
  sceneName: z.string(),
  scenes: z.array(sceneSchema).length(10),
});

export type ClothingAnalysisResult = z.infer<typeof clothingAnalysisSchema>;
export type ScenePlanResult = z.infer<typeof scenePlanSchema>;
