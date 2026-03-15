## MODIFIED Requirements

### Requirement: Worker 使用产品绑定模特

`scene_planning` 与 `scene_render` worker SHALL 以产品绑定模特为正式真源，而不是仅依赖临时 `modelImage`。

#### Scenario: Scene planning 读取模特描述

- **WHEN** 产品已绑定模特
- **THEN** `scene_planning` worker SHALL 读取该模特的图片和描述
- **AND** 将模特信息写入 planning metadata

#### Scenario: Scene render 使用绑定模特图

- **WHEN** `scene_render` worker 渲染 scene
- **THEN** worker SHALL 优先使用产品绑定模特图作为人物身份参考图
- **AND** prompt SHALL 包含模特描述
- **AND** 该模特 SHALL 在同一产品的所有 scene 和后续批次中保持一致

#### Scenario: Legacy modelImage compatibility

- **WHEN** 产品没有绑定模特，但历史 payload 中仍带有 `modelImage`
- **THEN** worker MAY 使用该 `modelImage` 作为兼容回退
- **AND** 产品绑定模特一旦存在，兼容回退 SHALL 不再覆盖它
