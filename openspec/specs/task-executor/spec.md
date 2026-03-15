## ADDED Requirements

### Requirement: Scene Planning Worker
`scene_planning` worker SHALL 使用 AI SDK Core 生成结构化 10 镜头计划，并输出 `scenes.json`。

#### Scenario: 生成固定 10 镜头规划
- **WHEN** worker 收到 `ClothingAnalysisResult`
- **THEN** SHALL 生成固定 10 个 scenes
- **AND** 其中 1-5 为 `full_body`
- **AND** 6-10 为 `close_up`

#### Scenario: 输出 legacy 等价 scene 字段
- **WHEN** scene planning 成功
- **THEN** 每个 scene SHALL 至少包含：
  - `shotName`
  - `framing`
  - `sceneType`
  - `sceneFamily`
  - `microLocation`
  - `diversityReason`
  - `pose`
  - `lighting`
  - `background`
  - `modelDirection`
  - `colorTone`
  - `sourceImageIndexes`
  - `renderGoal`
  - `requiredDetails`
  - `forbiddenDetails`
  - `seed`
  - `fullPrompt`

#### Scenario: 批量避重
- **WHEN** 同季同场景存在最近 4-8 个兄弟 SKU 的 `scenes.json`
- **THEN** worker SHALL 将这些历史场景作为 planning 输入
- **AND** 输出中包含 `batchDiversityContext`
- **AND** 避免 hero 场景骨架、micro-location 与道具组合高频重复

#### Scenario: scene plan 落盘
- **WHEN** scene planning 成功
- **THEN** worker SHALL 将 `ScenePlan` 写入任务结果
- **AND** 该结果 SHALL 成为 `scene_render` 的输入真源

#### Scenario: scene planning 触发下游
- **WHEN** scene planning 成功
- **THEN** worker SHALL 自动插入 `scene_render` 任务

### Requirement: Scene Render Worker
`scene_render` worker SHALL 使用 AI SDK image generation 接口逐 scene 渲染，而不是按数量循环。

#### Scenario: 逐 scene 渲染
- **WHEN** worker 收到 `ScenePlan`
- **THEN** SHALL 按 scene 顺序逐个渲染
- **AND** 每个 scene 使用其自己的 `fullPrompt`、`sourceImageIndexes`、`requiredDetails`、`forbiddenDetails`

#### Scenario: 模特参考图与源图输入
- **WHEN** scene render 执行
- **THEN** worker SHALL 同时提供产品绑定模特图与按 `sourceImageIndexes` 选出的服装源图
- **AND** 绑定模特图 SHALL 仅用于锁定人物身份一致性

#### Scenario: 图片生成 provider 配置
- **WHEN** `scene_render` worker 调用 AI SDK 图片模型
- **THEN** SHALL 优先从环境变量读取 `GEMINI_IMAGE_API_KEY` 和 `GEMINI_IMAGE_BASE_URL`
- **AND** 在未提供专用图片配置时回退到共享的 `GEMINI_API_KEY` / `GEMINI_BASE_URL`

#### Scenario: 输出到本地与 R2
- **WHEN** scene render 成功
- **THEN** worker SHALL 上传到 R2
- **AND** 写入 `productGeneratedImages`
- **AND** 更新任务结果中的 per-scene 输出信息

#### Scenario: 单 scene 失败可局部重试
- **WHEN** 某个 scene 渲染失败
- **THEN** 系统 SHALL 允许该 scene 单独重试
- **AND** 不要求整批从头开始

#### Scenario: 全部 scenes 失败
- **WHEN** 全部 scenes 渲染失败
- **THEN** 任务进入重试或 failed 流程

#### Scenario: 成功结算
- **WHEN** scene render 完成并形成可交付图集
- **THEN** 更新 `aiGenerationTasks` 为 completed
- **AND** 结算积分
- **AND** 更新产品状态为 `reviewing`

### Requirement: Worker 使用产品绑定模特
`scene_planning` 与 `scene_render` worker SHALL 以产品绑定模特为正式真源，而不是依赖临时任务字段。

#### Scenario: Scene planning 读取模特描述
- **WHEN** 产品已绑定模特
- **THEN** `scene_planning` worker SHALL 读取该模特的图片和描述
- **AND** 将模特信息写入 planning metadata

#### Scenario: Scene render 使用绑定模特图
- **WHEN** `scene_render` worker 渲染 scene
- **THEN** worker SHALL 使用产品绑定模特图作为人物身份参考图
- **AND** prompt SHALL 包含模特描述
- **AND** 该模特 SHALL 在同一产品的所有 scene 和后续批次中保持一致

### Requirement: Recovery Worker
Recovery worker SHALL 定期扫描超时任务并恢复或标记失败。

#### Scenario: 恢复超时任务
- **WHEN** 发现 processing 超过阈值且可重试的任务
- **THEN** 重置为 pending，清除锁定信息，设置退避时间

#### Scenario: 放弃超时任务
- **WHEN** 发现超时且超过最大重试次数的任务
- **THEN** 标记 failed，退还积分，更新产品状态
