## Why

当前 AI 编排已经切到 `clothing_analysis -> scene_planning -> scene_render`，但产品提交页、提交 API、worker payload 和旧 worker 注册里还残留了大量 legacy 配置与 “style” 语义。这让 `2026-03-15-scene-enum-refactor` 的场景枚举真源失效，也让当前代码继续承担不需要的兼容复杂度。

## What Changes

- **BREAKING**: 删除产品详情页里的“旧流程配置”入口，不再允许通过提交接口传入 `productConfigPath`、`selectedImages`、`selectedImageNotes`、`modelImage`、`customRequirements`
- **BREAKING**: 新编排链路只接受当前产品、已上传源图、产品绑定模特和场景枚举，不再读取 legacy YAML/skills 兼容字段
- **BREAKING**: worker 启动入口不再注册 `style_analysis`、`image_generation` 作为当前正式编排链路的一部分
- 收紧场景解析与产品创建逻辑，确保场景枚举是提交和编排的唯一真源，并与 `scene-enum-refactor` 保持一致
- 将应用层命名、prompt 文案、注释和测试从 “style/风格” 统一为 “scene/场景”；数据库列名保留时，仅作为底层存储细节

## Capabilities

### New Capabilities
- `scene-product-submit`: 产品详情提交和入队接口只允许新场景流程，不再暴露旧流程配置入口
- `scene-orchestration`: worker 编排只消费场景枚举、产品源图和绑定模特，不再支持 legacy 兼容 payload

### Modified Capabilities
- `scene-registry`: 场景注册表成为产品创建、提交和 worker 解析的统一真源，应用层不再依赖自由文本或旧 style 语义

## Impact

- 前端: 删除产品详情页旧流程配置面板，调整场景相关文案
- API: `/api/products/[id]/submit` 和 `/api/products` 收紧入参与场景解析逻辑
- Workers: 清理 legacy payload 字段、旧 handler 注册、prompt 文案和测试
- OpenSpec: 需要补充 scene-only 的提交与编排能力 spec，并修正 `scene-registry` 的要求
- 部署: worker 进程类型和 PM2 配置需要与新链路保持一致
