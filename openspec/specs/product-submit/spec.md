## Purpose

定义产品提交到 AI 编排队列时的正式行为，包括产品级模特绑定与入队前校验。

## Requirements

### Requirement: 产品提交时永久绑定模特

系统 SHALL 在产品级别保存永久模特绑定，而不是在每次生成时临时决定模特。

#### Scenario: 产品已绑定模特
- **WHEN** 产品提交前 `products.modelId` 已存在
- **THEN** 系统 SHALL 复用该模特
- **AND** 后续所有该产品的生成批次 SHALL 使用同一个模特
- **AND** 系统 SHALL NOT 在提交时重新随机选择模特

#### Scenario: 产品未绑定模特时自动分配
- **WHEN** 产品提交前 `products.modelId` 为空
- **THEN** 系统 SHALL 从当前客户自己的激活模特库中随机选择一个模特
- **AND** 将其写回 `products.modelId`
- **AND** 再继续创建 AI 任务和队列任务

#### Scenario: 客户没有可用模特
- **WHEN** 产品提交前 `products.modelId` 为空，且当前客户没有任何激活模特
- **THEN** 提交 SHALL 失败
- **AND** 系统 SHALL 返回明确错误，提示先上传模特

#### Scenario: 禁止绑定他人模特
- **WHEN** 产品绑定的 `modelId` 不属于当前客户
- **THEN** 提交 SHALL 失败
- **AND** 不得创建新的 AI 任务
