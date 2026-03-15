## MODIFIED Requirements

### Requirement: 产品详情页只暴露标准场景提交流程

草稿产品详情页 SHALL 只提供标准提交动作，不得展示旧流程配置入口，也不得要求用户输入额外的临时生成参数。

#### Scenario: 草稿产品显示标准提交动作
- **WHEN** 用户打开一个 `draft` 状态的产品详情页
- **THEN** 页面 SHALL 展示标准提交按钮
- **AND** 页面 SHALL NOT 展示 `配置.yaml`、`selected_images`、`model_image` 或类似旧流程配置表单

#### Scenario: 非草稿产品不显示提交入口
- **WHEN** 用户打开一个非 `draft` 状态的产品详情页
- **THEN** 页面 SHALL NOT 展示提交动作

### Requirement: 提交接口使用场景术语持久化

`POST /api/products` SHALL 将场景选择持久化到 `selectedSceneId` 和 `scenePreference` 字段（而非旧的 `selectedStyleId` 和 `stylePreference`）。

#### Scenario: 产品创建写入场景字段
- **WHEN** 客户通过 `POST /api/products` 创建产品并选择 `"country-garden"` 场景
- **THEN** 系统 SHALL 将场景 ID 写入 `products.selectedSceneId` 和 `products.scenePreference`
- **AND** 系统 SHALL NOT 写入 `selectedStyleId` 或 `stylePreference`（这些字段已不存在）

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

### Requirement: AI 任务生命周期使用场景字段

`ai-task-lifecycle.ts` 读取产品场景 ID 时 SHALL 使用 `product.selectedSceneId` 和 `product.scenePreference`。

#### Scenario: 解析持久化场景 ID
- **WHEN** `ai-task-lifecycle` 读取产品的已保存场景
- **THEN** 系统 SHALL 从 `product.selectedSceneId` 和 `product.scenePreference` 中解析合法场景枚举
- **AND** 系统 SHALL NOT 引用 `product.selectedStyleId` 或 `product.stylePreference`
