## Changes to scene-product-submit

### Requirement: 提交接口使用场景术语持久化 (MODIFIED)

`POST /api/products` SHALL 将场景选择只持久化到 `selectedSceneId` 字段。`scenePreference` 字段已删除。

#### Scenario: 产品创建只写入 selectedSceneId
- **WHEN** 客户通过 `POST /api/products` 创建产品并选择 `"country-garden"` 场景
- **THEN** 系统 SHALL 将场景 ID 写入 `products.selectedSceneId`
- **AND** 系统 SHALL NOT 写入 `scenePreference`（该字段已删除）

### Requirement: AI 任务生命周期使用场景字段 (MODIFIED)

`ai-task-lifecycle.ts` 读取产品场景 ID 时 SHALL 只使用 `product.selectedSceneId`，不再 fallback 读取 `scenePreference`。

#### Scenario: 解析持久化场景 ID
- **WHEN** `ai-task-lifecycle` 读取产品的已保存场景
- **THEN** 系统 SHALL 从 `product.selectedSceneId` 中解析合法场景枚举
- **AND** 系统 SHALL NOT 引用 `product.scenePreference`（该字段已删除）
