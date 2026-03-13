# 产品管理规格

## 产品编号规则

自动分配唯一产品编号，格式：`{年份后两位}{4位序号}`

例如：`260001` (2026年第0001个产品)

## 产品信息字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | uuid | 是 | 主键 |
| product_number | string | 是 | 产品编号，唯一 |
| user_id | uuid | 是 | 所属客户 ID |
| name | string | 是 | 产品名称 |
| category | string | 是 | 类目 |
| description | text | 否 | 产品描述 |
| shooting_requirements | text | 是 | 拍摄需求 |
| style_preference | string | 是 | 风格选择 |
| special_notes | text | 否 | 特别注意事项 |
| delivery_count | integer | 是 | 交付数量，默认 6 |
| status | enum | 是 | 产品状态 |
| created_at | timestamp | 是 | 创建时间 |
| updated_at | timestamp | 是 | 更新时间 |

## 产品状态流转

```
draft → submitted → queued → processing → reviewing
                                    ↓
                              client_reviewing → completed
                                    ↓
                              feedback_received → reworking → reviewing
                                    ↓
                              failed/cancelled
```

| 状态 | 说明 | 可转换到 |
|------|------|----------|
| draft | 草稿 | submitted, cancelled |
| submitted | 已提交 | queued, cancelled |
| queued | 入队等待 | processing |
| processing | 生成中 | reviewing, failed |
| reviewing | 待审核 | client_reviewing, reworking |
| client_reviewing | 待客户核对 | completed, feedback_received |
| feedback_received | 已收到反馈 | reworking |
| reworking | 返工中 | reviewing |
| completed | 已完成 | - |
| failed | 失败 | draft (可重试) |
| cancelled | 已取消 | - |

## 客户操作

1. **新建产品**: 填写产品信息，上传原始图片
2. **编辑产品**: 草稿状态下可编辑
3. **提交产品**: 消耗 1 点数，状态变为 submitted
4. **查看结果**: 查看审核通过后的成品图
5. **下载图片**: 单张下载或批量下载 ZIP
6. **反馈**: 对成品图提出问题或确认完成

## 管理端操作

1. **查看全部产品**: 全局视角的产品列表
2. **查看产品详情**: 查看产品信息和原始图片
3. **触发 AI 生成**: 将产品加入 AI 生成队列
4. **审核图片**: 对生成的图片进行审核
5. **确认交付**: 审核通过后确认交付给客户

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/products` | GET | 获取当前用户的产品列表 |
| `/api/products` | POST | 新建产品 |
| `/api/products/[id]` | GET | 获取产品详情 |
| `/api/products/[id]` | PATCH | 更新产品 |
| `/api/products/[id]/submit` | POST | 提交产品，消耗点数 |
| `/api/products/[id]/feedback` | POST | 提交图片反馈 |
| `/api/admin/products` | GET | 获取全部产品（管理员） |
| `/api/admin/products/[id]/review` | GET | 获取待审核产品详情 |
| `/api/admin/products/[id]/deliver` | POST | 确认交付产品 |
