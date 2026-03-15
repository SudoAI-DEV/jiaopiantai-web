## ADDED Requirements

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

### Requirement: 前端场景选择改用常量
`/products/new` 页面直接 import `SCENES` 常量渲染场景卡片，不再查询数据库，并在应用层统一使用“场景”语义。

#### Scenario: 页面加载
- **WHEN** 用户访问 `/products/new`
- **THEN** 显示 4 个场景卡片，数据来自代码常量，不发起数据库查询

#### Scenario: 场景选择提交
- **WHEN** 用户选择场景并提交表单
- **THEN** 请求 SHALL 提交所选场景的枚举 ID
- **AND** 前端文案 SHALL 使用“场景”而不是“风格”

### Requirement: API 枚举校验
`POST /api/products` 接口 SHALL 只接受合法场景枚举值作为场景选择，不再接受自由文本或 legacy 回退。

#### Scenario: 合法场景 ID
- **WHEN** 请求体中的场景选择为 `"country-garden"`
- **THEN** 接口 SHALL 正常创建产品
- **AND** 系统 SHALL 将该枚举值持久化为产品当前场景真源

#### Scenario: 非法场景 ID
- **WHEN** 请求体中的场景选择为空、为自由文本，或为 `"invalid-scene"`
- **THEN** 接口 SHALL 返回 400 错误
- **AND** 错误信息 SHALL 提示 "无效的场景选择"

### Requirement: 管理端场景页面调整

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
`/admin/scenes` 页面改为只读展示场景常量列表，移除数据库查询。

#### Scenario: 管理员查看场景
- **WHEN** 管理员访问 `/admin/scenes`
- **THEN** 显示 4 个场景的信息，数据来自代码常量

#### Scenario: 导航标签使用场景术语
- **WHEN** 管理后台导航渲染场景管理入口
- **THEN** 链接地址 SHALL 为 `/admin/scenes`
- **AND** 标签文案 SHALL 为 "场景模板"
- **AND** `/admin/styles` 路由 SHALL NOT 存在

### Requirement: Workers 场景解析使用枚举
`workers/src/lib/orchestration-context.ts` 的场景解析 SHALL 只接受合法场景枚举，并优先使用任务 payload 中的 `scene`；若任务 payload 缺失，再读取产品当前持久化的场景枚举。系统 SHALL NOT 使用旧别名、类目字段或自由文本猜测场景。

#### Scenario: 合法场景 ID 传入 worker
- **WHEN** task payload 的 `scene` 为 `"country-garden"`
- **THEN** `context.scene` 解析为 `"country-garden"`
- **AND** 类型 SHALL 为 `SceneId`

#### Scenario: 任务缺少场景但产品已持久化场景枚举
- **WHEN** task payload 中未提供 `scene`
- **AND** 产品当前持久化场景值为合法场景枚举
- **THEN** `context.scene` SHALL 使用该持久化场景枚举

#### Scenario: 没有合法场景枚举
- **WHEN** task payload 和产品记录中都不存在合法场景枚举
- **THEN** worker SHALL 失败并返回明确错误
- **AND** 系统 SHALL NOT 从 `category`、中文旧名称或 `sceneRef` 之外的任意自由文本推断场景
