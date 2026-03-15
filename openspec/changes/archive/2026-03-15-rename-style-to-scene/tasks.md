## 1. Drizzle Schema 更新

- [x] 1.1 `schema-pg.ts` products 表：`stylePreference` → `scenePreference`（列映射 `scene_preference`），`selectedStyleId` → `selectedSceneId`（列映射 `selected_scene_id`）
- [x] 1.2 `schema-pg.ts` ai_generation_tasks 表：`styleId` → `sceneId`（列映射 `scene_id`）
- [x] 1.3 `schema-pg.ts` 废弃表：`styleTemplates` → `sceneTemplates`（表名 `scene_templates`），`StyleTemplate` → `SceneTemplate`
- [x] 1.4 `schema-pg.ts` 选择表：`productStyleSelections` → `productSceneSelections`（表名 `product_scene_selections`），`styleId` → `sceneId`
- [x] 1.5 `schema-pg.ts` taskQueue type 注释：`style_analysis` → `clothing_analysis`
- [x] 1.6 删除并重新生成 `schema-pg.d.ts` 类型声明文件

## 2. 自动生成数据库迁移

- [x] 2.1 运行 `npx drizzle-kit generate` 自动生成迁移文件（应包含 ALTER TABLE RENAME COLUMN / RENAME TABLE）
- [x] 2.2 检查生成的迁移 SQL，确认是 RENAME 而非 DROP+CREATE
- [x] 2.3 在本地 PostgreSQL 验证迁移执行成功

## 3. Web 应用代码更新

- [x] 3.1 `src/app/api/products/route.ts`：`stylePreference` → `scenePreference`，`selectedStyleId` → `selectedSceneId`
- [x] 3.2 `src/lib/ai-task-lifecycle.ts`：`product.selectedStyleId` → `product.selectedSceneId`，`product.stylePreference` → `product.scenePreference`
- [x] 3.3 `src/lib/validations.ts`：feedback enum `style_not_match` → `scene_not_match`

## 4. 路由与 UI 更新

- [x] 4.1 重命名目录 `src/app/admin/styles/` → `src/app/admin/scenes/`，函数名 `AdminStylesPage` → `AdminScenesPage`
- [x] 4.2 `src/components/shared/admin-header.tsx`：导航 href `/admin/styles` → `/admin/scenes`，label `"风格模板"` → `"场景模板"`
- [x] 4.3 `src/app/admin/page.tsx`：仪表盘链接 `/admin/styles` → `/admin/scenes`
- [x] 4.4 `src/app/page.tsx` 落地页：section id `styles` → `scenes`，所有"风格模板"→"场景模板"，"风格选择"→"场景选择"，"展示风格"→"展示场景"

## 5. Workers 更新

- [x] 5.1 `workers/src/lib/orchestration-context.ts`：`product.selectedStyleId` → `product.selectedSceneId`，`product.stylePreference` → `product.scenePreference`，参数名 `storedScenePreference` 保留
- [x] 5.2 `workers/src/handlers/orchestration.test.ts`：所有产品 mock 数据的 `stylePreference` → `scenePreference`，`selectedStyleId` → `selectedSceneId`
- [x] 5.3 `workers/src/handlers/credit-flow.test.ts`：所有产品 mock 数据的 `stylePreference` → `scenePreference`，`selectedStyleId` → `selectedSceneId`

## 6. 脚本更新

- [x] 6.1 `scripts/import-legacy-images.ts`：所有 `selectedStyleId` → `selectedSceneId`，`stylePreference` → `scenePreference`

## 7. 验证

- [x] 7.1 运行 `tsc --noEmit` 确认所有 TypeScript 编译通过无错误
- [x] 7.2 运行 workers 测试确认通过
- [x] 7.3 运行 web 端构建 `npm run build` 确认成功
