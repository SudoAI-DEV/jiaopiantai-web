## MODIFIED Requirements

### Requirement: Worker 上下文使用场景字段名

worker 上下文 SHALL 从产品记录中读取 `selectedSceneId` 和 `scenePreference` 字段解析场景，而非旧的 `selectedStyleId` 和 `stylePreference`。

#### Scenario: 上下文装载场景
- **WHEN** `loadOrchestrationContext()` 装载产品场景
- **THEN** `resolveScene()` SHALL 读取 `product.selectedSceneId` 和 `product.scenePreference`
- **AND** SHALL NOT 引用 `product.selectedStyleId` 或 `product.stylePreference`

#### Scenario: 上下文装载源图
- **WHEN** `loadOrchestrationContext()` 装载一个正式任务
- **THEN** 系统 SHALL 使用该产品在数据库中的全部源图记录
- **AND** 系统 SHALL NOT 读取 `selectedImages` 或 `selectedImageNotes`

#### Scenario: 上下文装载模特
- **WHEN** 产品已绑定模特
- **THEN** 系统 SHALL 读取该模特的图片与描述
- **AND** 系统 SHALL NOT 读取 `modelImage` 作为回退

### Requirement: 场景编排和渲染使用场景术语

应用层 prompt、metadata 和测试语义 SHALL 使用 "scene/场景" 术语，而不是 "style/风格"。

#### Scenario: 服装分析提示词
- **WHEN** `clothing_analysis` 生成分析提示词
- **THEN** 提示词 SHALL 描述"目标场景"或"场景要求"
- **AND** 提示词 SHALL NOT 使用"风格偏好"作为当前正式术语

#### Scenario: 场景规划提示词
- **WHEN** `scene_planning` 生成 10 镜头计划提示词
- **THEN** 提示词 SHALL 包含场景枚举 ID、场景名称、场景描述和场景参考模板
- **AND** 提示词 SHALL 使用"场景"术语描述产品目标

### Requirement: 测试数据使用场景字段名

Workers 测试文件中的产品 mock 数据 SHALL 使用 `scenePreference` 和 `selectedSceneId` 字段名。

#### Scenario: orchestration 测试数据
- **WHEN** orchestration.test.ts 构造产品 mock 对象
- **THEN** 产品对象 SHALL 使用 `scenePreference` 和 `selectedSceneId` 字段
- **AND** SHALL NOT 使用 `stylePreference` 或 `selectedStyleId`

#### Scenario: credit-flow 测试数据
- **WHEN** credit-flow.test.ts 构造产品 mock 对象
- **THEN** 产品对象 SHALL 使用 `scenePreference` 和 `selectedSceneId` 字段
- **AND** SHALL NOT 使用 `stylePreference` 或 `selectedStyleId`
