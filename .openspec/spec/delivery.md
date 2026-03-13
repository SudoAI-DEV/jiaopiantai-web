# 交付管理规格

## 交付流程

1. 管理员审核筛选图片
2. 达到客户要求的交付数量
3. 管理员点击"确认交付"
4. 产品状态变为 client_reviewing
5. 客户查看成品图并确认

## 交付批次

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| product_id | uuid | 关联产品 ID |
| batch_number | integer | 交付批次号 |
| image_count | integer | 交付图片数量 |
| delivered_at | timestamp | 交付时间 |
| delivered_by | uuid | 交付操作人 |

## 交付图片

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| delivery_batch_id | uuid | 交付批次 ID |
| image_id | uuid | 图片 ID |
| sort_order | integer | 展示顺序 |

## 客户确认

客户收到交付通知后：

1. **无问题**: 点击"确认完成"，产品状态变为 completed
2. **有问题**: 提交反馈，选择问题类型和描述

## 下载功能

- **单张下载**: 点击单张图片下载按钮
- **批量下载**: 点击"批量下载 ZIP"，打包所有交付图片

## 通知

交付完成后，客户会收到通知（预留）：

- 邮件通知
- 站内消息
- 微信服务号推送（预留）
