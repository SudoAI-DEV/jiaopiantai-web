## MODIFIED Requirements

### Requirement: 场景常量定义
`src/lib/scenes.ts` 导出 `SCENES` 常量数组，包含 4 个场景对象，每个包含 `id`、`name`、`description`、`thumbnailUrl`、`sceneRef` 字段。导出 `SceneId` 类型和 `getSceneById()` / `isValidSceneId()` 工具函数。

#### Scenario: 引用场景列表
- **WHEN** 任何模块 import `SCENES` from `src/lib/scenes.ts`
- **THEN** 得到包含 4 个场景的只读数组，顺序为：海边艺术、自然田园、都市街拍、艺术建筑

#### Scenario: 类型安全
- **WHEN** 代码使用 `SceneId` 类型
- **THEN** 只接受 `"seaside-art" | "country-garden" | "urban-street" | "architectural-editorial"` 四个字面量

#### Scenario: 根据 ID 查询场景
- **WHEN** 调用 `getSceneById("seaside-art")`
- **THEN** 返回对应场景对象；传入非法 ID 时返回 `undefined`

#### Scenario: 校验场景 ID
- **WHEN** 调用 `isValidSceneId(value)`
- **THEN** 值为合法枚举时返回 `true`，否则返回 `false`

### Requirement: 数据库 schema 使用场景术语
Drizzle ORM schema 中所有与场景相关的字段名和表名 SHALL 使用 "scene" 术语，而不是 "style"。

#### Scenario: products 表字段
- **WHEN** 访问 products 表的场景相关字段
- **THEN** Drizzle 字段名 SHALL 为 `scenePreference`（映射 DB 列 `scene_preference`）和 `selectedSceneId`（映射 DB 列 `selected_scene_id`）
- **AND** 旧字段名 `stylePreference` 和 `selectedStyleId` SHALL NOT 存在于 schema 导出中

#### Scenario: ai_generation_tasks 表字段
- **WHEN** 访问 ai_generation_tasks 表的场景字段
- **THEN** Drizzle 字段名 SHALL 为 `sceneId`（映射 DB 列 `scene_id`）
- **AND** 旧字段名 `styleId` SHALL NOT 存在于 schema 导出中

#### Scenario: 废弃表重命名
- **WHEN** 引用废弃的场景模板表
- **THEN** Drizzle 导出名 SHALL 为 `sceneTemplates`（映射 DB 表 `scene_templates`），类型为 `SceneTemplate`
- **AND** 导出名 `styleTemplates` 和类型 `StyleTemplate` SHALL NOT 存在

#### Scenario: 场景选择表重命名
- **WHEN** 引用产品场景选择表
- **THEN** Drizzle 导出名 SHALL 为 `productSceneSelections`（映射 DB 表 `product_scene_selections`），其字段 `sceneId`（映射 DB 列 `scene_id`）
- **AND** 导出名 `productStyleSelections` 和字段 `styleId` SHALL NOT 存在

### Requirement: 管理端场景页面调整
`/admin/scenes` 页面改为只读展示场景常量列表。

#### Scenario: 管理员查看场景
- **WHEN** 管理员访问 `/admin/scenes`
- **THEN** 显示 4 个场景的信息，数据来自代码常量

#### Scenario: 导航标签使用场景术语
- **WHEN** 管理后台导航渲染场景管理入口
- **THEN** 链接地址 SHALL 为 `/admin/scenes`
- **AND** 标签文案 SHALL 为 "场景模板"
- **AND** `/admin/styles` 路由 SHALL NOT 存在

### Requirement: 前端场景选择改用常量
`/products/new` 页面直接 import `SCENES` 常量渲染场景卡片，不再查询数据库，并在应用层统一使用"场景"语义。

#### Scenario: 页面加载
- **WHEN** 用户访问 `/products/new`
- **THEN** 显示 4 个场景卡片，数据来自代码常量，不发起数据库查询

#### Scenario: 场景选择提交
- **WHEN** 用户选择场景并提交表单
- **THEN** 请求 SHALL 提交所选场景的枚举 ID
- **AND** 前端文案 SHALL 使用"场景"而不是"风格"
