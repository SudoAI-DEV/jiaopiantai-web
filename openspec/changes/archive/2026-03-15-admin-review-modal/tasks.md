## 1. 数据库迁移

- [x] 1.1 在 `src/lib/db/schema-pg.ts` 的 `productGeneratedImages` 表中新增 `rejectionReason` 字段（text 类型，可选）
- [x] 1.2 使用 Drizzle Kit 生成数据库迁移文件并执行迁移

## 2. API 修改

- [x] 2.1 修改 `src/app/api/admin/images/[id]/review/route.ts`，支持接收 `rejectionReason` 参数（JSON 对象，包含 presets 数组和 custom 字符串）
- [x] 2.2 当 status 为 `rejected` 时存储 rejectionReason，当 status 为其他值时清空 rejectionReason 为 null

## 3. 审核弹窗核心组件

- [x] 3.1 创建 `ImageReviewModal` 组件（`src/components/review/image-review-modal.tsx`），基于 shadcn/ui Dialog 实现 95vw×95vh 全屏弹窗
- [x] 3.2 实现弹窗布局：顶部导航栏（图片序号、上下张按钮、关闭按钮）、中部大图区域、底部原图对比和操作按钮
- [x] 3.3 实现图片导航状态管理：当前图片索引、待审核图片列表、切换逻辑

## 4. 图片缩放与拖拽

- [x] 4.1 实现 `useImageZoom` Hook，管理缩放级别（0.5x-5x）、偏移量、拖拽状态
- [x] 4.2 实现鼠标滚轮缩放（以鼠标位置为中心）
- [x] 4.3 实现鼠标拖拽平移
- [x] 4.4 实现双击放大（1x→2x）/重置（非1x→1x）
- [x] 4.5 实现缩放控制按钮（适应窗口 / 100% / 200% / +0.25x / -0.25x）

## 5. 原图对比

- [x] 5.1 在弹窗底部实现原图缩略图水平列表，从 productSourceImages 获取数据
- [x] 5.2 实现点击原图缩略图弹出覆盖层放大查看，支持缩放拖拽

## 6. 审核操作面板

- [x] 6.1 实现通过、驳回、重新生成三个操作按钮
- [x] 6.2 创建预设驳回理由常量数组（14 项），实现驳回理由面板（多选复选框 + 自定义输入框）
- [x] 6.3 实现驳回理由校验（至少选择一项或填写自定义理由）
- [x] 6.4 将审核操作对接现有 API（PATCH /api/admin/images/{id}/review），驳回时附带 rejectionReason

## 7. 自动翻页

- [x] 7.1 审核操作完成后自动跳转到下一张 pending 状态图片，带平滑过渡动画
- [x] 7.2 最后一张待审核图完成后显示"所有图片审核完成"提示并自动关闭弹窗

## 8. 键盘快捷键

- [x] 8.1 实现键盘事件监听：A/Enter=通过，R=驳回，←/→=切换，+/-=缩放，0=重置，Esc=关闭
- [x] 8.2 输入框聚焦时禁用字母快捷键，Esc 仅关闭驳回面板

## 9. 集成与测试

- [x] 9.1 在 `review-client.tsx` 中集成 ImageReviewModal，点击图片打开弹窗
- [x] 9.2 确保弹窗关闭后列表页面正确刷新审核状态
- [x] 9.3 验证完整审核流程：打开弹窗→缩放检查→对比原图→通过/驳回→自动翻页
