# 点数管理规格

## 点数体系

- 点数用于抵扣产品生成费用
- 1 个产品 = 1 点数
- 点数可通过管理员充值获得

## 用户点数字段

| 字段 | 类型 | 说明 |
|------|------|------|
| credits_balance | integer | 当前可用点数余额 |
| credits_frozen | integer | 冻结点数（待确认/待退还） |
| credits_total_spent | integer | 累计消耗点数 |

## 点数消耗逻辑（冻结 → 确认模式）

### 提交产品时

```
状态: credits_balance - 1, credits_frozen + 1
```

- 用户提交产品时，冻结 1 点数
- 产品状态变为 submitted
- 如果余额不足，拒绝提交

### 确认完成时

```
状态: credits_frozen - 1
```

- 产品完成审核并交付后，确认扣除冻结点数
- 产品状态变为 completed

### 取消/失败时

```
状态: credits_balance + 1, credits_frozen - 1
```

- 产品取消或生成失败时，退还冻结点数
- 产品状态变为 cancelled/failed

## 交易流水

记录所有点数变动，包括：

| 交易类型 | 说明 |
|----------|------|
| recharge | 管理员充值 |
| purchase | 购买（预留） |
| submission | 提交产品冻结 |
| completion | 完成确认扣除 |
| refund | 取消/失败退还 |

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/credits` | GET | 获取点数余额和流水 |
| `/api/admin/credits/recharge` | POST | 管理员充值点数 |
| `/api/admin/credits/transactions` | GET | 查看所有交易流水 |

## 权限

- 客户只能查看自己的点数余额和流水
- 管理员可以查看和操作所有客户的点数
