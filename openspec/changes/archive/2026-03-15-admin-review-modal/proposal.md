## Why

当前管理员审核 AI 生成图片时，直接在产品列表页面上操作，图片较小，无法仔细检查纹路、纽扣、领口等细节。缺少与原图对比的能力，也没有预设的驳回理由，导致审核效率低、质量把控不够精细。需要一个专业的全屏审核弹窗，支持大图查看、缩放对比、快速驳回和自动翻页，大幅提升审核效率和准确性。

## What Changes

- 新增全屏图片审核弹窗（Modal/Dialog），替代当前的 hover 操作模式
- 弹窗内展示 AI 生成图（大尺寸）+ 原图（对比参考），支持缩放、拖拽查看细节
- 新增预设驳回理由系统（裁切问题、模特不自然、纹路偏差、颜色偏差等），支持多选 + 自定义输入
- **BREAKING**: 数据库 `product_generated_images` 表新增 `rejectionReason` 字段，存储驳回理由
- 审核完一张图片后自动滚动/切换到下一张待审核图片，实现连续高效审核
- 支持键盘快捷键操作（通过/驳回/下一张）

## Capabilities

### New Capabilities
- `image-review-modal`: 全屏图片审核弹窗，包含大图展示、原图对比、缩放控制、预设驳回理由、自动翻页、键盘快捷键等完整审核交互体验

### Modified Capabilities

## Impact

- **数据库**: `product_generated_images` 表新增 `rejectionReason` (text) 字段
- **API**: `PATCH /api/admin/images/[id]/review` 需要支持接收 `rejectionReason` 参数
- **前端组件**: 
  - `src/app/admin/products/[id]/review/review-client.tsx` 需集成弹窗入口
  - 新增 `ImageReviewModal` 组件
- **依赖**: 可能需要图片缩放库（如 react-zoom-pan-pinch）或使用 CSS transform 实现
