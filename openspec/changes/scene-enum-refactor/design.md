## Context

当前场景数据分散在两处：数据库 `style_templates` 表（前端消费）和 `.agent/skills/` 下的 scene reference 文件（生成侧消费）。两者之间没有共享标识符，依赖人工保持同步。场景是固定的 4 个，短期内不会变动，不需要运行时动态管理。

## Goals / Non-Goals

**Goals:**
- 用一个 TypeScript 常量文件统一定义 4 个场景，作为前端和生成侧的单一事实来源
- 场景枚举值与 `.agent/skills/` 的 scene reference 文件名一一对应
- 消除数据库依赖，简化部署流程（无需 seed SQL）
- 保持 `products.stylePreference` 列不变，存储枚举 ID 字符串

**Non-Goals:**
- 不支持运行时动态添加场景（如需新场景，改代码重新部署）
- 不修改 AI 生成侧的 scene reference 文件内容
- 不修改 `products` 表结构（`stylePreference` 列保留为 text 类型）

## Decisions

### 1. 场景定义放在 `src/lib/scenes.ts`
使用 `as const` 常量数组 + 类型推导，而非 TypeScript enum。这样更灵活，支持附加元数据（名称、描述、缩略图路径）。

```typescript
export const SCENES = [
  {
    id: "seaside-art",
    name: "海边艺术",
    description: "地中海白墙蓝门、海岸礁石露台...",
    thumbnailUrl: "/scenes/seaside-art.jpg",
    sceneRef: "scene-a-seaside-art",
  },
  // ...
] as const;

export type SceneId = typeof SCENES[number]["id"];
```

### 2. 枚举 ID 使用短横线命名
`seaside-art` / `country-garden` / `urban-street` / `architectural-editorial`，简洁且可读。与 scene reference 文件名的映射通过 `sceneRef` 字段完成。

### 3. 缩略图使用静态文件
放在 `public/scenes/` 目录，由代码常量引用路径。不再依赖数据库 `thumbnail_url` 字段。

### 4. 不立即删除 `style_templates` 表
先停止使用，后续通过单独 migration 清理。避免破坏性变更影响现有数据。

### 5. API 校验改用枚举白名单
`POST /api/products` 中用 `SCENES.find(s => s.id === stylePreference)` 校验合法性。

### 6. Workers 场景解析统一使用枚举
`workers/src/lib/orchestration-context.ts` 当前的场景解析链 `payload.scene || product.category || product.stylePreference || 'default'` 改为：先解析出候选值，然后用 `isValidSceneId()` 校验，非法值 fallback 到默认场景而非静默接受。`orchestration-schemas.ts` 的 `metadata.scene` 字段从 `z.string()` 改为 `z.enum(SCENE_IDS)`。

## Risks / Trade-offs

- **Trade-off**: 新增场景需要改代码重新部署，但场景变化频率极低（季度级别），可接受
- **Risk**: 已有 `products.stylePreference` 存的旧 ID（如 `scene-a-seaside-art`）与新枚举 ID（`seaside-art`）不一致 → 需要数据迁移或兼容映射
- **Mitigation**: 在 `scenes.ts` 中保留 `sceneRef` 字段做反向映射，或直接用旧 ID 格式作为枚举值避免迁移
