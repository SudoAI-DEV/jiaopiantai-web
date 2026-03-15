## REMOVED Requirements

### Requirement: 废弃表重命名
**Reason**: `scene_templates` 表已被代码常量 (`src/lib/scenes.ts`) 完全替代，无任何代码查询该表。保留 schema 定义只增加混淆。
**Migration**: 场景数据由 `SCENES` 常量提供，`SceneTemplate` 类型由 `Scene` 类型（来自 `src/lib/scenes.ts`）替代。

## MODIFIED Requirements

### Requirement: 前端场景选择改用常量
`/products/new` 页面直接 import `SCENES` 常量渲染场景卡片，不再查询数据库，组件 prop 使用 `scenes` 命名。

#### Scenario: 页面加载
- **WHEN** 用户访问 `/products/new`
- **THEN** 显示 4 个场景卡片，数据来自代码常量，不发起数据库查询

#### Scenario: 场景选择提交
- **WHEN** 用户选择场景并提交表单
- **THEN** 请求 SHALL 提交所选场景的枚举 ID
- **AND** 前端文案 SHALL 使用"场景"而不是"风格"

#### Scenario: 组件 prop 命名
- **WHEN** `NewProductForm` 组件接收场景数据
- **THEN** prop 名 SHALL 为 `scenes`
- **AND** prop 类型 SHALL 为 `Scene[]`（来自 `src/lib/scenes.ts`）

### Requirement: 数据库 schema 使用场景术语
Drizzle ORM schema 中所有与场景相关的字段名和表名 SHALL 使用 "scene" 术语。`scene_templates` 表 SHALL NOT 存在于 schema 定义中。

#### Scenario: products 表字段
- **WHEN** 访问 products 表的场景相关字段
- **THEN** Drizzle 字段名 SHALL 为 `scenePreference`（映射 DB 列 `scene_preference`）和 `selectedSceneId`（映射 DB 列 `selected_scene_id`）
- **AND** 旧字段名 `stylePreference` 和 `selectedStyleId` SHALL NOT 存在于 schema 导出中

#### Scenario: ai_generation_tasks 表字段
- **WHEN** 访问 ai_generation_tasks 表的场景字段
- **THEN** Drizzle 字段名 SHALL 为 `sceneId`（映射 DB 列 `scene_id`）
- **AND** 旧字段名 `styleId` SHALL NOT 存在于 schema 导出中

#### Scenario: scene_templates 表已移除
- **WHEN** 检查 Drizzle schema 导出
- **THEN** `sceneTemplates` 表定义 SHALL NOT 存在
- **AND** `SceneTemplate` 类型 SHALL NOT 存在
- **AND** 数据库中 `scene_templates` 表 SHALL 已通过 migration 删除

#### Scenario: 场景选择表
- **WHEN** 引用产品场景选择表
- **THEN** Drizzle 导出名 SHALL 为 `productSceneSelections`（映射 DB 表 `product_scene_selections`），其字段 `sceneId`（映射 DB 列 `scene_id`）
- **AND** 导出名 `productStyleSelections` 和字段 `styleId` SHALL NOT 存在
