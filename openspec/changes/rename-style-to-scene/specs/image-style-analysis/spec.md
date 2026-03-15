## RENAMED Requirements

### Requirement: Clothing Analysis Worker
**FROM:** `image-style-analysis` 中的 "Clothing Analysis Worker"
**TO:** 保持 "Clothing Analysis Worker"（名称不变，但 spec 文件夹名应反映实际能力）

注：spec 文件夹名 `image-style-analysis` 中的 "style" 指的是 "clothing analysis"（服装分析）而非 "scene"（场景），但为了术语一致性，仓库内与 style 相关的引用应消除混淆。

## MODIFIED Requirements

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

#### Scenario: task_queue type 注释
- **WHEN** task_queue 表的 type 字段注释列举任务类型
- **THEN** 注释 SHALL 使用 `clothing_analysis` 而非 `style_analysis`
