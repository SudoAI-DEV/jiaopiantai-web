## 1. Schema

- [x] 1.1 创建 `task_queue` 表（通用任务队列）
- [x] 1.2 添加索引：`(type, status, available_at, priority, created_at)`、`(reference_id, reference_type)`、`(status, locked_at)`
- [x] 1.3 扩展 `productGeneratedImages`：增加 `generationTaskId` 字段
- [x] 1.4 扩展 `productSourceImages`：增加 `analysis` (jsonb)、`analyzedAt` 字段
- [x] 1.5 运行 Drizzle migration

## 2. Worker 基础框架

- [x] 2.1 创建 `workers/` 目录结构，初始化 package.json、tsconfig
- [x] 2.2 实现 DB 连接模块（复用 Drizzle 配置连 Neon）
- [x] 2.3 实现 `queue.ts`：原子领取（`FOR UPDATE SKIP LOCKED`）、状态更新、死任务恢复
- [x] 2.4 实现 worker 主循环：领取 → 执行 handler → 成功/失败处理 → sleep → 继续
- [x] 2.5 实现 `index.ts` 入口：根据 `--type` 参数启动对应 worker
- [x] 2.6 实现 graceful shutdown：SIGTERM 时完成当前任务后退出
- [x] 2.7 创建 `ecosystem.config.cjs`（pm2 配置）
- [x] 2.8 实现 `lib/gemini.ts`：`@google/genai` SDK 客户端封装

## 3. Style Analysis Worker

- [x] 3.1 实现 `handlers/style-analysis.ts`：使用 Gemini SDK 视觉分析源图风格
  - 下载源图 → base64 → Gemini `generateContent` 视觉分析 → 结构化风格标签
- [x] 3.2 将分析结果写入 `productSourceImages.analysis` + `analyzedAt`
- [x] 3.3 完成后自动插入下游 `image_generation` 任务（链式触发）
- [x] 3.4 处理失败场景：分析失败时跳过分析直接创建生成任务（降级策略）

## 4. Image Generation Worker

- [x] 4.1 实现 `handlers/image-generation.ts`：使用 Gemini SDK 生成商品图
  - 下载源图 → base64 → Gemini `generateContent` 图片模式 → 生成图片 buffer
  - 复用 `styled-clothing-shoot` skill 的 Gemini 调用模式（`responseModalities: ['TEXT', 'IMAGE']`）
- [x] 4.2 生成结果直接上传到 R2（`@aws-sdk/client-s3`）
- [x] 4.3 写入 `productGeneratedImages`（设置 `generationTaskId`、`reviewStatus=pending`）
- [x] 4.4 更新 `aiGenerationTasks` 状态为 completed + resultCount
- [x] 4.5 结算积分：`creditsFrozen--`、`creditsTotalSpent++`、记录 `creditTransactions`
- [x] 4.6 更新产品状态为 `reviewing`
- [x] 4.7 处理失败场景：Gemini 500/upstream_error → 重试；4xx → permanent failed

## 5. Recovery Worker

- [x] 5.1 实现死任务检测：`status=processing` 且 `locked_at` 超过 10 分钟
- [x] 5.2 未超过 maxAttempts → 重置为 pending + 指数退避
- [x] 5.3 超过 maxAttempts → 标记 failed + 退还积分 + 更新产品状态

## 6. Web 端改动

- [x] 6.1 修改 `/api/products/[id]/submit`：创建 `aiGenerationTasks` 后同时插入 `task_queue`（type=style_analysis）
- [x] 6.2 添加任务取消 API（可选）：取消 pending 任务 + 退还积分
- [x] 6.3 移除或废弃 `/api/internal/ai/trigger`

## 7. 测试与部署

- [x] 7.1 Queue 单元测试：领取逻辑、并发安全、重试退避、死任务恢复
- [x] 7.2 Style Analysis Handler 测试：缓存跳过、降级触发、链式入队
- [x] 7.3 Image Generation Handler 测试：跳过已完成任务、缺失任务错误
- [x] 7.4 Recovery 测试：积分退还、状态更新
- [x] 7.5 积分流转测试：冻结 → 结算 / 退还完整路径
- [x] 7.6 npm install + tsc 编译验证
- [x] 7.7 Mac mini 部署：pm2 start ecosystem.config.cjs，验证进程管理

## 8. AI SDK Orchestration Refactor

- [x] 8.1 引入 `ai`、`@ai-sdk/google`、`zod`，建立统一 provider 封装
- [x] 8.2 新增 `clothing_analysis` 任务类型，替换当前 `style_analysis` 的抽象
- [x] 8.3 实现 DB-native orchestration context 归一化，消费产品字段、源图记录、用户要求与历史任务结果
- [x] 8.4 使用 AI SDK `generateText + Output.object` 生成 `ClothingAnalysisResult`
- [x] 8.5 新增 `scene_planning` 任务类型，生成结构化 10 镜头 `ScenePlan`
- [x] 8.6 支持读取兄弟 SKU 最近批次的历史 scene plan，作为 batch diversity 输入
- [x] 8.7 将 `ScenePlan` 持久化到任务结果，作为 `scene_render` 真源
- [x] 8.8 新增 `scene_render` 任务类型，按 scene 逐张渲染，而非按 `targetCount` 循环
- [x] 8.9 使用 AI SDK image generation 接口替换当前直接 `@google/genai` 渲染入口
- [x] 8.10 支持 scene-level `sourceImageIndexes`、`requiredDetails`、`forbiddenDetails`
- [x] 8.11 将渲染结果写入 `productGeneratedImages`、任务结果与 R2
- [x] 8.12 调整积分与产品状态流转：`submitted -> analyzing -> planning -> rendering -> reviewing`
- [x] 8.13 补充 AI SDK orchestration 测试：clothing analysis / scene planning / scene render / batch diversity
