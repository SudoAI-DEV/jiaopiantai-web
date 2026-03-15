## MODIFIED Requirements

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
