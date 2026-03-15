## Context

当前审核流程：
- 管理员在审核页面筛选图片，标记为 approved/rejected
- 客户可以在产品页面看到所有生成的图片（带状态标签）
- 产品状态为 `reviewing` 时，客户可以看到但不能下载
- 下载按钮仅在 `status === "completed"` 时显示

当前判断逻辑：
- 客户始终能见到生成图片，但通过 deliveryCount 限制"期望交付"数量
- 缺乏审核员显式"完成审核"的动作

## Goals / Non-Goals

**Goals:**
- 添加"完成审核"按钮，审核员点击后将产品状态变更为 `client_reviewing`
- 客户仅在审核员完成审核后才能查看生成图片
- 记录审核完成时间和审核人

**Non-Goals:**
- 不修改现有的 deliveryCount 字段，仍作为期望数量展示
- 不修改图片下载逻辑（仍需等最终完成）
- 不涉及退款、重试等扩展流程

## Decisions

### 1. 状态流转设计
- 审核员点击"完成审核" → 产品状态从 `reviewing` 变为 `client_reviewing`
- `client_reviewing` 状态：客户可以查看审核通过的图片，但无法下载

### 2. 客户可见性控制
- **方案A**: 根据产品状态控制图片可见性（`client_reviewing` 或 `completed` 可见）
  - 优点：实现简单，与状态机一致
  - 缺点：审核期间客户完全看不到图片
- **方案B**: 始终显示图片，但区分"可下载"状态
  - 优点：客户可即时看到进度
  - 缺点：不满足"审核完成后客户才能看"的需求
- **采用方案A**：审核期间图片对客户不可见，完成审核后可见

### 3. API 设计
- 新增 `PATCH /api/admin/products/[id]/complete-review` 端点
- 仅接受 `status === "reviewing"` 的产品
- 记录 `reviewedAt`, `reviewedBy` 字段

### 4. 数据模型
- 复用 products 表现有字段
- 新增 `reviewedAt` (timestamp) 记录审核完成时间
- 新增 `reviewedBy` (userId) 记录审核人

## Risks / Trade-offs

- [Risk] 审核员误操作完成审核 → [Mitigation] 添加确认弹窗
- [Risk] 完成后发现漏选图片 → [Mitigation] 支持管理员将状态改回 `reviewing` 继续审核
- [Risk] 客户在审核期间无法查看进度 → [Mitigation] 可在客户页面显示"等待审核"状态，而非完全隐藏

## Open Questions

- 是否需要在审核完成时通知客户？（后续需求）
- 是否需要记录每个图片的审核时间？（当前已有 reviewedAt）
