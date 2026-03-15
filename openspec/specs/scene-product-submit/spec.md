## Purpose

定义产品详情页的标准提交入口，以及提交到正式场景编排链路时允许和禁止的输入边界。

## Requirements

### Requirement: 产品详情页只暴露标准场景提交流程

草稿产品详情页 SHALL 只提供标准提交动作，不得展示旧流程配置入口，也不得要求用户输入额外的临时生成参数。

#### Scenario: 草稿产品显示标准提交动作
- **WHEN** 用户打开一个 `draft` 状态的产品详情页
- **THEN** 页面 SHALL 展示标准提交按钮
- **AND** 页面 SHALL NOT 展示 `配置.yaml`、`selected_images`、`model_image` 或类似旧流程配置表单

#### Scenario: 非草稿产品不显示提交入口
- **WHEN** 用户打开一个非 `draft` 状态的产品详情页
- **THEN** 页面 SHALL NOT 展示提交动作

### Requirement: 提交接口拒绝 legacy 生成参数

`POST /api/products/[id]/submit` SHALL 只接受标准提交请求；若请求体携带旧流程生成参数，接口 MUST 拒绝请求，而不是继续兼容处理。

#### Scenario: 标准提交创建首个编排任务
- **WHEN** 已登录客户提交一个拥有源图的草稿产品，且请求体未包含 legacy 字段
- **THEN** 系统 SHALL 创建 `aiGenerationTasks` 记录
- **AND** 系统 SHALL 创建一条 `clothing_analysis` 队列任务
- **AND** 任务 payload SHALL 包含 `productId`、`aiGenerationTaskId`、`sourceImageIds`、`sourceImageUrls` 和 `scene`

#### Scenario: 请求体包含旧流程字段
- **WHEN** 请求体包含 `generationConfig`、`productConfigPath`、`selectedImages`、`selectedImageNotes`、`modelImage` 或 `customRequirements`
- **THEN** 接口 SHALL 返回 400
- **AND** 响应 SHALL 明确提示旧流程配置已移除

### Requirement: 提交入队只依赖系统正式真源

产品提交入队时 SHALL 只依赖数据库中的产品记录、源图记录、绑定模特和场景枚举，不得从请求体临时覆盖这些正式真源。

#### Scenario: 提交时复用已绑定模特
- **WHEN** 产品已经绑定了客户自己的模特
- **THEN** 系统 SHALL 复用该模特继续入队
- **AND** 队列 payload SHALL NOT 额外写入临时 `modelImage`

#### Scenario: 提交时写入场景枚举
- **WHEN** 产品提交成功
- **THEN** 首个编排任务 payload 中的 `scene` SHALL 等于产品当前保存的场景枚举 ID
- **AND** 下游 worker SHALL 以该字段作为优先真源

### Requirement: 提交接口使用场景术语持久化

`POST /api/products` SHALL 将场景选择持久化到 `selectedSceneId` 和 `scenePreference` 字段（而非旧的 `selectedStyleId` 和 `stylePreference`）。

#### Scenario: 产品创建写入场景字段
- **WHEN** 客户通过 `POST /api/products` 创建产品并选择 `"country-garden"` 场景
- **THEN** 系统 SHALL 将场景 ID 写入 `products.selectedSceneId` 和 `products.scenePreference`
- **AND** 系统 SHALL NOT 写入 `selectedStyleId` 或 `stylePreference`（这些字段已不存在）

### Requirement: AI 任务生命周期使用场景字段

`ai-task-lifecycle.ts` 读取产品场景 ID 时 SHALL 使用 `product.selectedSceneId` 和 `product.scenePreference`。

#### Scenario: 解析持久化场景 ID
- **WHEN** `ai-task-lifecycle` 读取产品的已保存场景
- **THEN** 系统 SHALL 从 `product.selectedSceneId` 和 `product.scenePreference` 中解析合法场景枚举
- **AND** 系统 SHALL NOT 引用 `product.selectedStyleId` 或 `product.stylePreference`
