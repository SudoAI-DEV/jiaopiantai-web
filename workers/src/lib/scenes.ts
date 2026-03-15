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
    description:
      "地中海白墙蓝门、海岸礁石露台、棕榈树荫长廊、海风吹拂的轻盈度假感，适合飘逸裙装与清新色调服饰",
    sceneRef: "scene-a-seaside-art",
  },
  {
    id: "country-garden",
    name: "自然田园",
    description:
      "庄园草坪、温室花房、石木院屋、藤蔓旧门、花境小径，清新浪漫的精致庄园感，适合棉麻质感与柔和色调服饰",
    sceneRef: "scene-b-country-garden",
  },
  {
    id: "urban-street",
    name: "都市街拍",
    description:
      "欧式老街石巷、咖啡馆外摆、复古市集广场、彩色建筑立面，时髦松弛的城市漫步感，适合日常穿搭与街头风格",
    sceneRef: "scene-d-urban-street",
  },
  {
    id: "architectural-editorial",
    name: "艺术建筑",
    description:
      "美术馆、博物馆回廊、夯土厚墙门洞、雕塑庭院、矿物感极简建筑，暖调高级时装大片感，适合结构感与设计感服饰",
    sceneRef: "scene-e-architectural-editorial",
  },
] as const;

export type SceneId = (typeof SCENES)[number]["id"];
export const SCENE_IDS = SCENES.map((s) => s.id) as [SceneId, ...SceneId[]];

export function getSceneById(id: string) {
  return SCENES.find((s) => s.id === id);
}

export function resolveSceneId(value: string | null | undefined): SceneId | undefined {
  if (!value) {
    return undefined;
  }

  return getSceneById(value.trim())?.id;
}

export function getSceneByValue(value: string | null | undefined) {
  const sceneId = resolveSceneId(value);
  return sceneId ? getSceneById(sceneId) : undefined;
}

export function isValidSceneId(id: string): id is SceneId {
  return SCENES.some((s) => s.id === id);
}
