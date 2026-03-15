## Changes to scene-orchestration

### Requirement: Worker 上下文不再读取 scenePreference (MODIFIED)

worker 上下文解析场景时 SHALL 只使用 `product.selectedSceneId`，`scenePreference` 字段已从数据库中移除。

#### Scenario: 上下文装载场景
- **WHEN** `loadOrchestrationContext()` 装载产品场景
- **THEN** `resolveScene()` SHALL 只读取 `product.selectedSceneId`
- **AND** SHALL NOT 引用 `product.scenePreference`（该字段已删除）

### Requirement: 测试数据使用场景字段名 (MODIFIED)

Workers 测试文件中的产品 mock 数据 SHALL 只使用 `selectedSceneId` 字段名，不再包含 `scenePreference`。

#### Scenario: orchestration 测试数据
- **WHEN** orchestration.test.ts 构造产品 mock 对象
- **THEN** 产品对象 SHALL 使用 `selectedSceneId` 字段
- **AND** SHALL NOT 包含 `scenePreference` 字段

#### Scenario: credit-flow 测试数据
- **WHEN** credit-flow.test.ts 构造产品 mock 对象
- **THEN** 产品对象 SHALL 使用 `selectedSceneId` 字段
- **AND** SHALL NOT 包含 `scenePreference` 字段
