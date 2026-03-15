## Why

`products` 表同时存在 `scene_preference`（text）和 `selected_scene_id`（varchar(50)）两个字段，功能重叠——都用于记录产品关联的场景。代码中存在 fallback 逻辑同时读取两个字段（`ai-task-lifecycle.ts`、`orchestration-context.ts`），增加了维护负担和混淆风险。应删除冗余的 `scene_preference`，只保留 `selected_scene_id`。

## What Changes

- **BREAKING** 删除 `products` 表的 `scene_preference` 列（Drizzle schema + migration）
- 移除所有代码中对 `scenePreference` 的读取和写入
- 移除 fallback 逻辑，统一使用 `selectedSceneId`
- 更新测试中的 mock 数据，去掉 `scenePreference` 字段

## Capabilities

### New Capabilities

_无_

### Modified Capabilities

- `scene-product-submit`: 提交产品时不再写入 `scenePreference`，只写 `selectedSceneId`
- `scene-orchestration`: 解析场景时不再 fallback 读取 `scenePreference`

## Impact

- **Schema**: `src/lib/db/schema-pg.ts` 删除 `scenePreference` 字段
- **Migration**: 新增 drizzle migration 删除 `scene_preference` 列
- **API**: `src/app/api/products/route.ts` 移除 `scenePreference` 赋值
- **Business logic**: `src/lib/ai-task-lifecycle.ts` 移除 fallback
- **Workers**: `workers/src/lib/orchestration-context.ts` 移除 fallback
- **Tests**: `workers/src/handlers/orchestration.test.ts`、`credit-flow.test.ts` 移除 mock 中的 `scenePreference`
- **Scripts**: `scripts/import-legacy-images.ts` 移除 `scenePreference` 写入
