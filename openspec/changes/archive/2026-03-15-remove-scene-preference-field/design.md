## Overview

删除 `products.scene_preference` 列，统一使用 `products.selected_scene_id` 存储场景选择。这是一个纯减法变更，不引入新功能。

## Database Changes

### Migration: Drop `scene_preference` column

```sql
ALTER TABLE "products" DROP COLUMN IF EXISTS "scene_preference";
```

- 使用 `drizzle-kit generate` 生成迁移文件
- Drizzle schema 中删除 `scenePreference` 字段定义

## Code Changes

### 1. Schema (`src/lib/db/schema-pg.ts`)

删除:
```typescript
scenePreference: text('scene_preference'),
```

### 2. API Route (`src/app/api/products/route.ts`)

移除 POST handler 中的 `scenePreference` 赋值（约 Line 147），只保留 `selectedSceneId`。

### 3. Business Logic (`src/lib/ai-task-lifecycle.ts`)

Line 96 的 fallback 逻辑:
```typescript
const persistedSceneId = [product.selectedSceneId, product.scenePreference].find(...)
```
简化为:
```typescript
const persistedSceneId = product.selectedSceneId
```

### 4. Workers (`workers/src/lib/orchestration-context.ts`)

Lines 138-139 的 `resolveScene()` 调用移除 `product.scenePreference` 参数，只传 `product.selectedSceneId`。

### 5. Scripts (`scripts/import-legacy-images.ts`)

移除 Line 762 的 `scenePreference: product.sceneStyle` 写入。

### 6. Tests

- `workers/src/handlers/orchestration.test.ts`: mock 数据中删除 `scenePreference`
- `workers/src/handlers/credit-flow.test.ts`: mock 数据中删除 `scenePreference`

## No UI Changes

前端表单 (`new-product-form.tsx`) 只使用 `selectedSceneId`，无需修改。

## Risks

- **数据丢失**: `scene_preference` 列数据将被永久删除。当前该列与 `selected_scene_id` 值相同（API 写入同一个值），无实际数据丢失风险。
- **向后兼容**: Workers 和 API 必须同时部署。Vercel 部署时 migration 会在 build 阶段执行，确保一致性。
