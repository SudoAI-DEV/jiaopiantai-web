## ADDED Requirements

### Requirement: Clothing Analysis Worker
`clothing_analysis` worker SHALL 使用 AI SDK Core 生成结构化服装语义结果，并触发下游 scene planning。

#### Scenario: 使用 authoritative config
- **WHEN** worker 收到 payload
- **THEN** worker SHALL 优先读取 DB 中的产品字段、源图记录、用户要求与历史任务结果
- **AND** 可选消费 payload 中的 legacy 兼容字段

#### Scenario: 已有文本分析则直接归一化
- **WHEN** payload 或历史任务结果中已包含完整结构化服装语义
- **THEN** worker SHALL 直接归一化为结构化 `ClothingAnalysisResult`
- **AND** 不重复对全部源图进行模型分析

#### Scenario: 配置缺失时补分析
- **WHEN** DB 中缺失完整服装语义上下文
- **THEN** worker SHALL 使用 AI SDK `generateText + Output.object` 对源图进行补分析
- **AND** 生成结果必须包含图片角色、服装总纲、正反差异、装饰元素、必保留细节与易错项

#### Scenario: 结构化服装分析输出
- **WHEN** clothing analysis 成功
- **THEN** 输出 SHALL 至少包含：
  - `selectedSources`
  - `imageDescriptions`
  - `clothingSummary`
  - `mustShowDetails`
  - `frontOnlyDetails`
  - `backOnlyDetails`
  - `forbiddenMistakes`

#### Scenario: 写入分析结果并触发下游
- **WHEN** clothing analysis 成功
- **THEN** worker SHALL 将结构化结果写入任务结果
- **AND** 可兼容写回 `productSourceImages.analysis`
- **AND** 自动插入 `scene_planning` 任务

#### Scenario: 本地图片资产
- **WHEN** 待分析图片引用是 worker 机器上的本地文件路径
- **THEN** worker SHALL 直接读取本地文件供 AI SDK 使用

### Requirement: AI SDK Provider 集成
worker SHALL 使用 `ai` + `@ai-sdk/google` 作为统一模型访问层，不再直接依赖 `@google/genai` 做主流程编排。

#### Scenario: Provider 初始化
- **WHEN** worker 启动
- **THEN** 优先从环境变量读取 `GEMINI_ANALYSIS_API_KEY` 和 `GEMINI_ANALYSIS_BASE_URL`
- **AND** 在未提供专用分析配置时回退到共享的 `GEMINI_API_KEY` / `GEMINI_BASE_URL`
- **AND** 创建 AI SDK Google provider

#### Scenario: Clothing analysis 默认模型
- **WHEN** `clothing_analysis` worker 对源图执行多模态分析
- **THEN** SHALL 默认使用 Gemini 3 Flash 模型
- **AND** MAY 通过环境变量覆盖具体模型 ID

#### Scenario: 结构化输出校验
- **WHEN** clothing analysis 调用模型
- **THEN** SHALL 使用 schema-based structured output
- **AND** 结果必须通过本地 schema 校验后才能进入下游阶段
