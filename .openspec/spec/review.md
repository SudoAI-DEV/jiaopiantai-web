# 图片审核规格

## 审核状态

| 状态 | 说明 |
|------|------|
| pending | 待审核 |
| approved | 通过 |
| rejected | 淘汰 |
| regenerate | 需重新生成 |

## 审核流程

1. AI 生成约 20 张图片
2. 管理员在瀑布流中查看所有图片
3. 对每张图片进行审核操作
4. 有"需重新生成"则创建新批次任务
5. 通过数量 >= 客户要求数量时，可确认交付

## 审核操作

| 操作 | 快捷键 | 说明 |
|------|--------|------|
| 通过 | F / A | 图片标记为 approved，加入交付列表 |
| 淘汰 | J / R | 图片标记为 rejected |
| 需重新生成 | K / T | 图片标记为 regenerate，触发新任务 |
| 上一张 | ← | 查看上一张图片 |
| 下一张 | → | 查看下一张图片 |

## 批次管理

- 每次 AI 生成任务为一批次 (batch_number)
- 需重新生成时，batch_number + 1
- 交付时按 batch_number 分组展示

## 交付确认

- 管理员点击"确认交付"按钮
- 产品状态变为 client_reviewing
- 客户可在产品详情页查看成品图

## 客户反馈

客户可对成品图提交反馈：

| 反馈类型 | 说明 |
|----------|------|
| perfect | 完美，无需修改 |
| minor_issues | 小问题 |
| major_issues | 大问题，需要重做 |
| other | 其他 |

反馈时可选择预设标签或输入自定义文字描述。

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/admin/images/[id]/review` | PATCH | 更新图片审核状态 |
| `/api/admin/images/batch/[batch_number]` | GET | 获取指定批次的所有图片 |
| `/api/products/[id]/feedback` | POST | 客户提交反馈 |
