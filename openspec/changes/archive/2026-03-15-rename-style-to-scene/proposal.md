## Why

代码库中"style/风格"和"scene/场景"术语混用严重。场景（scenes）已在代码层面确立为正式概念（`src/lib/scenes.ts`），但数据库字段（`style_preference`、`selected_style_id`、`style_id`）、Drizzle ORM 变量名、管理后台路由（`/admin/styles`）、UI 文案（"风格模板"）仍大量使用旧的 style 术语。线上用户看到的 admin 页面和落地页均显示"风格"而非"场景"，与实际业务概念不一致，增加理解和维护成本。

## What Changes

- **BREAKING** 数据库列重命名：`products.style_preference` → `scene_preference`，`products.selected_style_id` → `selected_scene_id`，`ai_generation_tasks.style_id` → `scene_id`
- **BREAKING** Drizzle ORM 字段名统一：`stylePreference` → `scenePreference`，`selectedStyleId` → `selectedSceneId`，`styleId` → `sceneId`
- **BREAKING** 废弃表重命名：`style_templates` → `scene_templates`，`product_style_selections` → `product_scene_selections`，对应字段 `style_id` → `scene_id`
- **BREAKING** 类型重命名：`StyleTemplate` → `SceneTemplate`，`productStyleSelections` → `productSceneSelections`，`styleTemplates` → `sceneTemplates`
- 管理后台路由 `/admin/styles` → `/admin/scenes`，导航标签 "风格模板" → "场景模板"
- 落地页所有 "风格" UI 文案统一为 "场景"（风格模板→场景模板、多样化风格选择→多样化场景选择等）
- 验证枚举值 `style_not_match` → `scene_not_match`
- task_queue type 注释 `style_analysis` → `clothing_analysis`
- Workers 及测试文件中所有 `stylePreference` / `selectedStyleId` 引用同步更新
- 导入脚本 `scripts/import-legacy-images.ts` 中的字段引用同步更新

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `scene-registry`: 废弃表和选择表的 Drizzle 导出名从 style 改为 scene
- `scene-product-submit`: 产品创建 API 写入的字段名从 stylePreference/selectedStyleId 改为 scenePreference/selectedSceneId
- `scene-orchestration`: Workers 读取产品场景 ID 的字段名变更
- `image-style-analysis`: spec 名称本身包含 style，且 task_queue type 注释需更新

## Impact

- **数据库**: 需要新的 Drizzle 迁移文件重命名 5 个列和 2 个表
- **前端路由**: `/admin/styles` → `/admin/scenes`，涉及文件移动
- **API**: `POST /api/products` 写入字段名变更（请求/响应接口不变，前端已用 `selectedSceneId`）
- **Workers**: `orchestration-context.ts` 及全部相关测试文件
- **脚本**: `import-legacy-images.ts` 字段引用
- **类型声明**: `schema-pg.d.ts` 需重新生成
- **不受影响**: `src/lib/scenes.ts`（已正确）、前端表单（已用 `selectedSceneId`）、Drizzle 历史迁移文件（不修改）
