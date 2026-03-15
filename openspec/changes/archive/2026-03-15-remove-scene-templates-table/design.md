## Context

`scene_templates` 表是早期数据库驱动场景管理的遗留产物。场景管理已在 `scene-enum-refactor` 中迁移为代码常量 (`src/lib/scenes.ts`)，`scene_templates` 当时标记为 deprecated 但保留了 schema 定义。目前没有任何代码查询该表，可安全移除。

## Goals / Non-Goals

**Goals:**
- 从 Drizzle schema 中删除 `sceneTemplates` 表定义和 `SceneTemplate` 类型
- 生成 Drizzle migration 执行 `DROP TABLE scene_templates`
- 将前端 `sceneTemplates` prop 重命名为 `scenes`，消除命名混淆

**Non-Goals:**
- 不修改场景常量本身（4 个场景保持不变）
- 不修改 `products` 表中的 `selectedSceneId` / `scenePreference` 字段
- 不修改 API 校验逻辑

## Decisions

### 1. 直接 DROP TABLE，不做数据备份

**选择**: 直接在 migration 中 `DROP TABLE IF EXISTS scene_templates`

**理由**: 该表从未被写入过有效数据（场景定义始终在代码中），即使有历史数据也已被代码常量完全替代。

**替代方案**: 先备份数据再删除 — 不必要，表内无业务价值数据。

### 2. 前端 prop 重命名 `sceneTemplates` → `scenes`

**选择**: 将 `new-product-form.tsx` 的 prop 从 `sceneTemplates` 改为 `scenes`

**理由**: "templates" 暗示数据来自模板表，实际来自代码常量。`scenes` 更简洁准确。

### 3. 使用 `drizzle-kit generate` 生成 migration

**选择**: 先删除 schema 定义，再运行 `drizzle-kit generate` 自动生成 SQL

**理由**: 保持 migration 与 schema 同步，避免手写 SQL 遗漏。

## Risks / Trade-offs

- **[已部署实例]** → 新 migration 会在下次部署时自动 DROP TABLE。如果需要回滚到旧代码，表将不存在。**缓解**: 旧代码也不查询该表，无实际影响。
- **[schema-pg.d.ts 生成文件]** → 删除 schema 导出后，`src/lib/db/schema-pg.d.ts` 中的对应类型也会消失。**缓解**: 该文件已被 ESLint ignore，且从不被直接 import。
