/**
 * 场景注册表 — 前端展示 + Workers 生成 + Skills 的单一事实来源
 *
 * 4 个固定场景，每个场景对应一个 .agent/skills 下的 scene reference 文件。
 * 新增场景时在此文件添加即可，无需数据库变更。
 */

export const SCENES = [
  {
    id: "seaside-art",
    name: "海边艺术",
    description:
      "地中海白墙蓝门、海岸礁石露台、棕榈树荫长廊、海风吹拂的轻盈度假感，适合飘逸裙装与清新色调服饰",
    thumbnailUrl: "/scenes/seaside-art.jpg",
    sceneRef: "scene-a-seaside-art",
  },
  {
    id: "country-garden",
    name: "自然田园",
    description:
      "庄园草坪、温室花房、石木院屋、藤蔓旧门、花境小径，清新浪漫的精致庄园感，适合棉麻质感与柔和色调服饰",
    thumbnailUrl: "/scenes/country-garden.jpg",
    sceneRef: "scene-b-country-garden",
  },
  {
    id: "urban-street",
    name: "都市街拍",
    description:
      "欧式老街石巷、咖啡馆外摆、复古市集广场、彩色建筑立面，时髦松弛的城市漫步感，适合日常穿搭与街头风格",
    thumbnailUrl: "/scenes/urban-street.jpg",
    sceneRef: "scene-d-urban-street",
  },
  {
    id: "architectural-editorial",
    name: "艺术建筑",
    description:
      "美术馆、博物馆回廊、夯土厚墙门洞、雕塑庭院、矿物感极简建筑，暖调高级时装大片感，适合结构感与设计感服饰",
    thumbnailUrl: "/scenes/architectural-editorial.jpg",
    sceneRef: "scene-e-architectural-editorial",
  },
] as const;

/** 场景 ID 字面量联合类型 */
export type SceneId = (typeof SCENES)[number]["id"];

/** 场景 ID 数组，供 zod enum / 校验使用 */
export const SCENE_IDS = SCENES.map((s) => s.id) as [SceneId, ...SceneId[]];

/** 单个场景的类型 */
export type Scene = (typeof SCENES)[number];

/** 根据 ID 查找场景，找不到返回 undefined */
export function getSceneById(id: string): Scene | undefined {
  return SCENES.find((s) => s.id === id);
}

/** 根据正式场景 ID 解析场景枚举 */
export function resolveSceneId(value: string | null | undefined): SceneId | undefined {
  if (!value) {
    return undefined;
  }

  return getSceneById(value.trim())?.id;
}

/** 根据正式场景 ID 查场景 */
export function getSceneByValue(value: string | null | undefined): Scene | undefined {
  const sceneId = resolveSceneId(value);
  return sceneId ? getSceneById(sceneId) : undefined;
}

/** 校验是否为合法场景 ID */
export function isValidSceneId(id: string): id is SceneId {
  return SCENES.some((s) => s.id === id);
}
