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
`/products/new` 页面直接 import `SCENES` 常量渲染场景卡片，不再查询数据库。

#### Scenario: 页面加载
- **WHEN** 用户访问 `/products/new`
- **THEN** 显示 4 个场景卡片，数据来自代码常量，不发起数据库查询

#### Scenario: 场景选择提交
- **WHEN** 用户选择场景并提交表单
- **THEN** `stylePreference` 字段值为场景枚举 ID（如 `"seaside-art"`）

### Requirement: API 枚举校验
`POST /api/products` 接口校验 `stylePreference` 必须为合法场景枚举值。

#### Scenario: 合法场景 ID
- **WHEN** 请求体 `stylePreference` 为 `"country-garden"`
- **THEN** 正常创建产品

#### Scenario: 非法场景 ID
- **WHEN** 请求体 `stylePreference` 为 `"invalid-scene"`
- **THEN** 返回 400 错误，提示 "无效的场景选择"

### Requirement: 管理端场景页面调整
`/admin/styles` 页面改为只读展示场景常量列表，移除数据库查询。

#### Scenario: 管理员查看场景
- **WHEN** 管理员访问 `/admin/styles`
- **THEN** 显示 4 个场景的信息，数据来自代码常量

### Requirement: Workers 场景解析使用枚举
`workers/src/lib/orchestration-context.ts` 的场景解析改用 `isValidSceneId()` 校验，`orchestration-schemas.ts` 的场景字段改用枚举。

#### Scenario: 合法场景 ID 传入 worker
- **WHEN** task payload 或 product.stylePreference 为 `"country-garden"`
- **THEN** `context.scene` 解析为 `"country-garden"`，类型为 `SceneId`

#### Scenario: 非法场景 ID 传入 worker
- **WHEN** task payload 的 scene 为空或不在枚举中
- **THEN** fallback 到默认场景（第一个枚举值），并记录警告日志

#### Scenario: 场景计划生成使用枚举
- **WHEN** `scene-planning` handler 生成 AI 提示词
- **THEN** 使用 `getSceneById(context.scene)` 获取场景中文名用于提示词
