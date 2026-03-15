## 1. Schema & Migration

- [x] 1.1 删除 `src/lib/db/schema-pg.ts` 中的 `scenePreference: text('scene_preference')` 字段
- [x] 1.2 运行 `npx drizzle-kit generate` 生成删除 `scene_preference` 列的迁移文件

## 2. API & 业务逻辑

- [x] 2.1 移除 `src/app/api/products/route.ts` 中 POST handler 的 `scenePreference` 赋值
- [x] 2.2 简化 `src/lib/ai-task-lifecycle.ts` 中的 fallback 逻辑，只使用 `product.selectedSceneId`
- [x] 2.3 移除 `workers/src/lib/orchestration-context.ts` 中 `resolveScene()` 对 `product.scenePreference` 的引用

## 3. 脚本 & 测试

- [x] 3.1 移除 `scripts/import-legacy-images.ts` 中的 `scenePreference` 写入
- [x] 3.2 删除 `workers/src/handlers/orchestration.test.ts` 中所有 `scenePreference` mock 值
- [x] 3.3 删除 `workers/src/handlers/credit-flow.test.ts` 中所有 `scenePreference` mock 值

## 4. 验证

- [x] 4.1 验证构建通过 (`npm run build`)
- [x] 4.2 验证 worker 测试通过
