## Context

当前代码库已经存在新的正式编排链路 `clothing_analysis -> scene_planning -> scene_render`，并且 `2026-03-15-scene-enum-refactor` 已把固定场景收敛到 `src/lib/scenes.ts`。但实现里仍残留三类旧语义：

- 产品详情页保留“旧流程配置”面板，并允许把 legacy 参数直接塞进 `/api/products/[id]/submit`
- worker payload 与上下文仍携带 `selectedImages`、`modelImage`、`customRequirements` 等临时兼容字段
- 应用层 prompt、注释、变量名和测试仍混用 “style/风格” 和 “scene/场景”

这些残留会让当前正式链路继续承担旧 skills 的兼容复杂度，也让场景枚举无法成为提交和编排的一致真源。

## Goals / Non-Goals

**Goals:**
- 删除产品详情页中的旧流程配置入口
- 让提交接口和 worker 编排只接受新场景流程的数据边界
- 让场景枚举成为产品创建、提交和 worker 解析的唯一正式真源
- 在应用层、prompt 和测试中统一使用 “scene/场景” 术语

**Non-Goals:**
- 不在本次变更中迁移数据库列名 `stylePreference` / `selectedStyleId`
- 不处理历史 legacy 产品数据修复；历史数据如需继续生成，应先补齐正式场景枚举
- 不要求立即删除所有 legacy 文件；只要求它们不再是正式运行链路的一部分

## Decisions

### 1. 提交入口直接拒绝 legacy body，而不是静默忽略

`POST /api/products/[id]/submit` 将保留为“无配置提交”接口。若请求体出现 `generationConfig`、`productConfigPath`、`selectedImages`、`selectedImageNotes`、`modelImage`、`customRequirements`，直接返回 `400`。

原因：
- 明确告知旧入口已移除，防止客户端误以为这些字段仍然有效
- 避免静默忽略导致排查困难
- 能强制前后端、脚本和人工测试统一走新流程

备选方案是“忽略这些字段继续提交”，但这会继续保留模糊兼容语义，因此不采用。

### 2. 首个队列任务显式写入 `scene`

提交成功后创建 `clothing_analysis` 任务时，payload 会显式写入当前产品的场景枚举值。后续 `scene_planning` 和 `scene_render` 继续沿用这一字段。

原因：
- worker 不必再从 `category` 或其他自由文本推断场景
- 可以把“无合法场景”的问题提前暴露为数据错误
- 与 `scene-enum-refactor` 中“场景枚举是唯一真源”的目标保持一致

### 3. worker 上下文只从正式记录装载数据

`loadOrchestrationContext()` 仅装载：
- 产品记录
- 产品全部源图
- 产品绑定模特
- task payload 中的 `scene`
- 产品已持久化的正式场景枚举

它不再读取 `selectedImages`、`selectedImageNotes`、`modelImage`、`customRequirements`，也不再解析 `legacy-product-config`。

原因：
- 这些字段属于旧 skills 的输入模型，不是当前数据库驱动流程的正式真源
- 产品级绑定模特已经存在，不应再允许任务级临时覆盖
- 选择性源图、临时补充要求如果未来需要恢复，应该以新的数据库能力重新建模，而不是继续挂在 legacy payload 上

### 4. 缺少合法场景时 fail fast

worker 解析场景时采用严格顺序：
1. task payload 的 `scene`
2. 产品持久化的正式场景枚举

只要两者都不是合法枚举，就直接抛错，不再从 `category`、中文旧名称或其他自由文本回退。

原因：
- 生成错误场景的成本远高于任务失败重试
- 旧 alias 推断会掩盖历史数据不完整的问题
- 审核和回归测试更容易对齐正式数据模型

### 5. 术语统一分层处理

本次不迁移数据库列名，但应用层将统一为“场景”语义：
- UI 标签、提示文案、注释、prompt、测试名称都改为 scene/场景
- 代码中如需读取 `product.stylePreference` / `product.selectedStyleId`，仅在 schema 边界读取，然后立刻映射为本地 `scene` 语义变量

原因：
- 数据库迁移和代码术语清理的风险级别不同
- 先统一应用层语义，可立即降低误解和新代码继续扩散 style 命名的风险

### 6. legacy worker 从正式入口移除

`workers/src/index.ts` 中不再把 `style_analysis` / `image_generation` 作为正式图片编排任务类型暴露。对应 handler 文件可以暂时保留，但它们不再属于当前部署和测试主链路。

原因：
- 当前正式链路已经是 scene-first orchestration
- 继续暴露旧任务类型，会让部署配置和排障继续分叉

## Risks / Trade-offs

- [历史产品缺少正式场景枚举会导致提交或 worker 失败] → 通过 fail-fast 暴露问题；如需继续使用历史产品，先补齐正式场景 ID
- [仍保留数据库列名中的 style 单词] → 在设计上明确它只是存储细节，应用层统一映射为 scene 语义
- [删除旧配置入口会让少量手工测试路径失效] → 统一回到数据库驱动的正式链路，减少隐藏状态
- [legacy 文件暂时还在仓库中] → 先从运行入口和测试主链路移除，后续可在独立清理中彻底删除

## Migration Plan

1. 更新 OpenSpec 要求，明确 scene-only 提交与编排边界
2. 删除产品详情页旧流程配置面板
3. 收紧 `/api/products/[id]/submit` 与 `submitProductToQueue()`，拒绝 legacy body，并在入队时显式写入 `scene`
4. 收紧 `POST /api/products` 与 orchestration context 的场景解析，只接受合法场景枚举
5. 清理 worker payload、prompt、测试和启动入口中的 legacy/style 语义
6. 运行 `npm run build`、`npm --prefix workers test`、`npm --prefix workers run build`

## Open Questions

- 无。当前范围内的行为边界已经明确，剩余工作是按 spec 收紧实现。
