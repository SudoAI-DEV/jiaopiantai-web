## Why

`scene_templates` 数据库表已被代码常量 (`src/lib/scenes.ts`) 完全替代，当前没有任何代码查询该表，但 Drizzle schema 中仍保留其定义和类型导出，增加了维护混乱。现在应该彻底移除。

## What Changes

- **BREAKING**: 删除 `scene_templates` 数据库表（通过 Drizzle migration）
- 从 `schema-pg.ts` 中移除 `sceneTemplates` 表定义和 `SceneTemplate` 类型导出
- 将前端组件中的 `sceneTemplates` prop 重命名为 `scenes`，消除与已删除表的命名混淆

## Capabilities

### New Capabilities

_(无)_

### Modified Capabilities

- `scene-registry`: 移除"废弃表重命名"相关的 scenario，明确场景数据完全由代码常量驱动，不再有数据库表

## Impact

- **数据库**: 需要新的 migration 执行 `DROP TABLE scene_templates`
- **Schema**: `src/lib/db/schema-pg.ts` 删除 `sceneTemplates` 导出
- **前端**: `new-product-form.tsx` 和 `page.tsx` 中 prop 名 `sceneTemplates` → `scenes`
- **类型**: `SceneTemplate` 类型移除，已有代码使用 `Scene` 类型（来自 `scenes.ts`）
