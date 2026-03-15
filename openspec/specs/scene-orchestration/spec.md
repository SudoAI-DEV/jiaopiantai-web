## Purpose

定义正式图片生成 worker 的 scene-only 编排方式，确保链路只消费数据库正式真源和场景枚举。

## Requirements

### Requirement: Worker 编排仅消费新场景链路数据

正式图片编排链路 SHALL 只由 `clothing_analysis`、`scene_planning`、`scene_render` 和 `recovery` 组成，不再将 legacy worker 作为当前正式流程的一部分。

#### Scenario: worker 仅注册新链路任务类型
- **WHEN** worker 进程启动并注册可处理的任务类型
- **THEN** 正式图片编排 SHALL 只包含 `clothing_analysis`、`scene_planning`、`scene_render`
- **AND** 不得要求 `style_analysis` 或 `image_generation` 才能完成当前产品生成

#### Scenario: 新任务链按顺序推进
- **WHEN** `clothing_analysis` 完成
- **THEN** 系统 SHALL 自动创建 `scene_planning` 任务
- **AND** `scene_planning` 完成后 SHALL 自动创建 `scene_render` 任务

### Requirement: Worker 上下文不再读取 legacy payload

worker 上下文 SHALL 只从正式记录中装载产品、源图、绑定模特和场景信息，不得继续读取或解析 legacy 兼容字段。

#### Scenario: 上下文装载源图
- **WHEN** `loadOrchestrationContext()` 装载一个正式任务
- **THEN** 系统 SHALL 使用该产品在数据库中的全部源图记录
- **AND** 系统 SHALL NOT 读取 `selectedImages` 或 `selectedImageNotes`

#### Scenario: 上下文装载模特
- **WHEN** 产品已绑定模特
- **THEN** 系统 SHALL 读取该模特的图片与描述
- **AND** 系统 SHALL NOT 读取 `modelImage` 作为回退

#### Scenario: 上下文装载场景
- **WHEN** `loadOrchestrationContext()` 装载产品场景
- **THEN** `resolveScene()` SHALL 只读取 `product.selectedSceneId`
- **AND** SHALL NOT 引用 `product.scenePreference`（该字段已删除）
- **AND** 系统 SHALL NOT 从 `category`、中文旧别名或任意自由文本推断场景

### Requirement: 场景编排和渲染使用场景术语

应用层 prompt、metadata 和测试语义 SHALL 使用 “scene/场景” 术语，而不是 “style/风格”。

#### Scenario: 服装分析提示词
- **WHEN** `clothing_analysis` 生成分析提示词
- **THEN** 提示词 SHALL 描述“目标场景”或“场景要求”
- **AND** 提示词 SHALL NOT 使用“风格偏好”作为当前正式术语

#### Scenario: 场景规划提示词
- **WHEN** `scene_planning` 生成 10 镜头计划提示词
- **THEN** 提示词 SHALL 包含场景枚举 ID、场景名称、场景描述和场景参考模板
- **AND** 提示词 SHALL 使用“场景”术语描述产品目标

### Requirement: 场景渲染只使用绑定模特和正式分析结果

`scene_render` SHALL 只基于场景计划、服装分析、产品源图和产品绑定模特生成图片，不再接受 legacy 覆盖输入。

#### Scenario: 渲染时使用绑定模特
- **WHEN** `scene_render` 生成某个 scene
- **THEN** 系统 SHALL 使用产品绑定模特图作为人物身份参考图
- **AND** 同一产品的所有 scene 和后续批次 SHALL 保持该模特一致

#### Scenario: 渲染结果写入待审核图片
- **WHEN** `scene_render` 成功生成图片并上传到 R2
- **THEN** 系统 SHALL 写入 `productGeneratedImages`
- **AND** 新图片的 `reviewStatus` SHALL 为 `pending`

### Requirement: 测试数据使用场景字段名

Workers 测试文件中的产品 mock 数据 SHALL 只使用 `selectedSceneId` 字段名，不再包含 `scenePreference`。

#### Scenario: orchestration 测试数据
- **WHEN** orchestration.test.ts 构造产品 mock 对象
- **THEN** 产品对象 SHALL 使用 `selectedSceneId` 字段
- **AND** SHALL NOT 包含 `scenePreference` 字段

#### Scenario: credit-flow 测试数据
- **WHEN** credit-flow.test.ts 构造产品 mock 对象
- **THEN** 产品对象 SHALL 使用 `selectedSceneId` 字段
- **AND** SHALL NOT 包含 `scenePreference` 字段
