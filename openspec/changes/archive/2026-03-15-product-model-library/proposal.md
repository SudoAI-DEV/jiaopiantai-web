## Why

当前生成链路里的“模特”仍然是临时输入：

- 可能来自 legacy `modelImage`
- 可能在一次提交里手动传入
- 没有客户私有模特库
- 没有产品级永久绑定

这会带来三个业务问题：

1. 同一个产品的不同批次可能使用不同模特，人物一致性失控
2. 模特不能按客户隔离管理，无法形成客户自己的可复用资产
3. 模特图虽然需要上传到 R2/CDN，但系统里没有正式表来维护模特元数据、描述和归属关系

新的要求是：

- 模特必须维护在数据库中
- 模特图必须上传到 R2，并通过现有 `/api/files/...` 路径访问
- 模特必须按客户隔离，不能跨客户共享
- 产品一旦绑定某个模特，后续所有生成批次都复用这个模特
- 只有产品尚未绑定模特时，系统才从该客户自己的模特库里随机挑选一个并写回产品

## What Changes

- 新增客户私有模特库表，存储模特图片、描述、归属客户和状态
- 扩展 `products`，增加永久绑定的 `modelId`
- 新增模特库 API，支持查询和创建模特记录，并将模特图上传到 R2
- 修改产品提交逻辑：提交时若 `products.modelId` 为空，则从当前客户的可用模特中随机选择一个并写回产品
- 修改 worker 编排上下文：统一从产品绑定的模特读取图片和描述，不再依赖临时 `modelImage`
- 修改 scene planning / scene render prompt，使其同时使用模特图和模特描述

## Capabilities

### New Capabilities

- **customer-model-library**: 客户私有模特库，支持模特图片上传、描述维护、客户隔离和随机选择

### Modified Capabilities

- **product-submit**: 产品提交时自动补全永久模特绑定
- **task-executor**: scene planning / render 使用产品绑定模特而不是临时模特参数

## Impact

- 新增数据库表：`customer_models`
- 修改数据库表：`products.model_id`
- 新增 API：模特库查询 / 创建
- 修改产品提交和 worker 编排逻辑
- 新增或更新测试：提交绑定、客户隔离、scene render 模特输入
