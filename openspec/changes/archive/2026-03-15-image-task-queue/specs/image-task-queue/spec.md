## ADDED Requirements

### Requirement: 通用任务队列
系统 SHALL 提供 `task_queue` 作为编排基础设施，用于执行 `clothing_analysis`、`scene_planning`、`scene_render`、`recovery` 等任务类型。

#### Scenario: 产品提交时入队 clothing analysis
- **WHEN** 用户提交产品（`/api/products/[id]/submit`）
- **THEN** 创建 `aiGenerationTasks`
- **AND** 插入一条 `task_queue` 任务，`type=clothing_analysis`
- **AND** payload 至少包含 `productId`、`aiGenerationTaskId`、源图信息以及 DB-native orchestration context

#### Scenario: DB 上下文作为正式输入
- **WHEN** 提交产品时已存在产品字段、源图记录、用户要求、风格选择或模特选择
- **THEN** 系统 SHALL 将这些 DB 记录视为正式编排输入
- **AND** 后续 worker SHALL 从这些输入衍生服装分析与 scene planning

#### Scenario: legacy 字段仅作兼容输入
- **WHEN** 提交产品时额外提供 `productConfigPath`、`selectedImages`、`selectedImageNotes`、`modelImage` 或 `customRequirements`
- **THEN** 系统 MAY 将这些字段作为兼容输入
- **AND** 不应把 `skills` 或本地目录结构当作运行时硬依赖

#### Scenario: clothing analysis 链式触发
- **WHEN** `clothing_analysis` 任务完成
- **THEN** 系统 SHALL 自动插入 `scene_planning` 任务
- **AND** payload 包含结构化服装分析结果

#### Scenario: scene planning 链式触发
- **WHEN** `scene_planning` 任务完成
- **THEN** 系统 SHALL 自动插入 `scene_render` 任务
- **AND** payload 包含完整 10 镜头 `ScenePlan`

#### Scenario: scene plan 持久化
- **WHEN** `scene_planning` 成功
- **THEN** 系统 SHALL 将结构化 `ScenePlan` 写入任务结果
- **AND** 该结果 SHALL 作为后续逐 scene 渲染的真源

#### Scenario: 取消待处理任务
- **WHEN** 用户取消自己的产品任务，且该产品仍存在 `status=pending` 的 queue task
- **THEN** 系统 SHALL 将该产品关联的 pending queue task 标记为 `cancelled`
- **AND** 将最新 `aiGenerationTask` 标记为 `cancelled`
- **AND** 退还冻结积分，并将产品状态更新为 `cancelled`

### Requirement: Worker 原子领取
Worker SHALL 使用 `FOR UPDATE SKIP LOCKED` 原子领取任务，确保多 worker 并发安全。

#### Scenario: 单个 worker 领取
- **WHEN** worker 轮询且存在 `status=pending` 且 `available_at <= now()` 的同类型任务
- **THEN** 原子更新：`status=processing`，`locked_at=now()`，`locked_by=workerId`，`attempt_count++`

#### Scenario: 多 worker 并发领取
- **WHEN** 两个 worker 同时尝试领取
- **THEN** `SKIP LOCKED` SHALL 保证各自领取不同任务，不会重复执行

#### Scenario: 无可用任务
- **WHEN** 无符合条件的 pending 任务
- **THEN** worker SHALL sleep 后重试

### Requirement: 重试与退避
系统 SHALL 对可重试失败实施指数退避重试，对不可重试失败立即标记终态。

#### Scenario: 可重试失败
- **WHEN** 任务执行失败且错误类型为 retryable，且 `attemptCount < maxAttempts`
- **THEN** 状态重置为 `pending`
- **AND** `availableAt` 按指数退避推迟

#### Scenario: 不可重试失败
- **WHEN** 错误类型为 permanent 或 `attemptCount >= maxAttempts`
- **THEN** 状态标记为 `failed`
- **AND** 触发积分退还

### Requirement: 死任务恢复
系统 SHALL 自动检测和恢复因 worker 崩溃而卡住的任务。

#### Scenario: Processing 超时
- **WHEN** 任务 `status=processing` 且 `locked_at` 超过阈值
- **THEN** 如果 `attemptCount < maxAttempts`，重置为 pending + 退避
- **AND** 否则标记 failed

## MODIFIED Requirements

### Requirement: 积分结算
系统 SHALL 在编排任务完整生命周期中正确处理积分流转。

#### Scenario: 提交时冻结
- **WHEN** 产品提交
- **THEN** `creditsBalance--`，`creditsFrozen++`

#### Scenario: scene render 完成时结算
- **WHEN** `scene_render` 任务完成并形成可交付结果集
- **THEN** `creditsFrozen--`，`creditsTotalSpent++`
- **AND** 记录 `creditTransactions(type=settlement)`

#### Scenario: 失败或取消时退还
- **WHEN** 任务最终 failed 或 cancelled
- **THEN** `creditsFrozen--`，`creditsBalance++`
- **AND** 记录 `creditTransactions(type=refund)`

### Requirement: 旧 HTTP 触发接口废弃
系统 SHALL 不再通过 `/api/internal/ai/trigger` 触发 AI 生成。

#### Scenario: 调用旧 internal trigger
- **WHEN** 客户端或后台仍请求 `/api/internal/ai/trigger`
- **THEN** 接口返回 `410 Gone`
- **AND** 响应中明确说明 AI 生成已改为由 worker queue 驱动
