## Why

当前审核弹窗里的原图放大查看只能停留在单张图片上，管理员放大检查细节时还要退出覆盖层再点下一张原图，打断审核节奏。与此同时，弹窗把已审核图片视为不可再次操作，一旦误判就需要退出当前流程手动补救，容易拖慢审核并造成状态不一致。

## What Changes

- 为原图放大覆盖层增加键盘导航能力，支持在保持放大查看状态下使用 `↑` / `↓` 键切换同一产品的其他原图
- 调整原图预览的状态管理，让覆盖层知道当前原图索引，并在切图时重置缩放/拖拽状态
- 调整审核操作约束，允许管理员将 `approved` 图片改为 `rejected`，也允许将 `rejected` 图片改回 `approved`
- 在可逆审核操作中保留现有驳回理由校验与清理规则：改成 `rejected` 时必须提供理由，改成非 `rejected` 时清空 `rejectionReason`
- 更新审核弹窗和审核网格的按钮/提示文案，明确已审核图片仍可被重新判定

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `image-review-modal`: 扩展原图放大覆盖层键盘导航，并允许管理员在审核弹窗中修正已通过/已驳回的审核结论

## Impact

- **前端组件**:
  - `src/components/review/image-review-modal.tsx`
  - `src/components/review/use-image-zoom.ts`
  - `src/app/admin/products/[id]/review/review-client.tsx`
- **API**:
  - `PATCH /api/admin/images/[id]/review` 的现有状态更新接口将继续复用，但前端会开始依赖其支持已审核状态之间的切换
- **测试/验证**:
  - 审核弹窗键盘快捷键与状态切换流程需要补充交互验证
