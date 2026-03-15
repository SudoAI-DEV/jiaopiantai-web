## Why

当前产品提交后，虽然已有 worker queue，但流程抽象仍然错误：它把 legacy 流程压扁成了“风格分析 → 泛化生图”两段式执行，无法复现旧的 `organize-product-folders` + `styled-clothing-shoot` 完整能力。

legacy 真正的完成链路是：

1. 先完成服装语义上下文
2. 基于全部源图和文本配置完成服装语义分析
3. 生成 10 镜头 `scenes.json`
4. 按 scene 逐张渲染与重渲染

同时，这次需要改用 AI SDK 官方框架实现编排，而不是继续直接调用 `@google/genai`。根据 AI SDK 官方 workflow patterns，当前场景更适合使用 AI SDK Core 的 structured workflow / orchestrator-worker 模式，而不是黑盒 agent loop。

实现上采用 DB-native 新流程：

- 运行时以数据库中的产品、源图、任务结果为真源
- `skills` 与 `配置.yaml` 仅作为历史行为参考，不作为运行时硬依赖

## What Changes

- 建立统一的任务队列表 `task_queue`，支持多种任务类型（风格分析、图片生成等）
- 实现基于 pm2 的多 worker 架构，部署在 Mac mini，持续轮询 DB 领取和执行任务
- 将当前两段式流程重构为 AI SDK Core orchestrated workflow：
  - `clothing_analysis`
  - `scene_planning`
  - `scene_render`
- Worker 改用 `ai` + `@ai-sdk/google`：
  - `generateText + Output.object` 生成结构化服装分析与 scene plan
  - `generateImage` 执行逐 scene 渲染
- 完善积分结算和产品状态同步
- 让数据库中的产品、源图、结构化分析结果、scene plan 成为正式编排输入
- 可选兼容 legacy 字段，但不把 `skills` / 本地目录当成运行时依赖

## Capabilities

### New Capabilities

- **task-queue**: 通用任务队列表，支持多种任务类型、优先级、重试、锁定
- **worker-runner**: pm2 管理的 worker 进程，启动后持续领取→执行→领取循环
- **clothing-analysis-worker**: 服装语义分析 worker，使用 AI SDK Core 生成结构化服装分析
- **scene-planning-worker**: 10 镜头规划 worker，使用 AI SDK Core 生成结构化 `scenes.json`
- **scene-render-worker**: 渲染 worker，使用 AI SDK 的 image generation 接口逐 scene 出图

### Modified Capabilities

- **product-submit**: 提交产品时除创建 `aiGenerationTasks` 外，同时插入编排起点任务，并绑定 DB-native orchestration context

## Impact

- 新增数据库表：`task_queue`（通用任务队列）
- 新增独立项目目录：`workers/`，包含 worker 入口、AI SDK orchestration、各类型 handler
- 新增 pm2 配置：`ecosystem.config.cjs`
- 新增依赖：`ai`、`@ai-sdk/google`、`zod`
- 修改现有提交流程：同步写入任务队列，并以数据库中的产品上下文作为正式编排输入
- 部署位置：Mac mini（与 Vercel Web 服务分离）
