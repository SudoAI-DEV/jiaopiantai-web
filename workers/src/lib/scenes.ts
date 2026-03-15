/**
 * 场景注册表（Workers 端）
 *
 * 与 src/lib/scenes.ts 保持同步。Workers 独立运行，不能直接引用 Next.js 侧代码，
 * 因此这里维护一份轻量副本。新增场景时需同步两处。
 */

export const SCENES = [
  {
    id: "seaside-art",
    name: "海边艺术",
    sceneRef: "scene-a-seaside-art",
  },
  {
    id: "country-garden",
    name: "自然田园",
    sceneRef: "scene-b-country-garden",
  },
  {
    id: "urban-street",
    name: "都市街拍",
    sceneRef: "scene-d-urban-street",
  },
  {
    id: "architectural-editorial",
    name: "艺术建筑",
    sceneRef: "scene-e-architectural-editorial",
  },
] as const;

export type SceneId = (typeof SCENES)[number]["id"];
export const SCENE_IDS = SCENES.map((s) => s.id) as [SceneId, ...SceneId[]];

export function getSceneById(id: string) {
  return SCENES.find((s) => s.id === id);
}

export function isValidSceneId(id: string): id is SceneId {
  return SCENES.some((s) => s.id === id);
}
