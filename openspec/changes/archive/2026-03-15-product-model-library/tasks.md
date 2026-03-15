## 1. Schema

- [x] 1.1 新增 `customer_models` 表：客户归属、描述、图片 URL、文件元数据、激活状态
- [x] 1.2 扩展 `products`：增加 `modelId`
- [x] 1.3 添加索引：`customer_models(user_id, is_active, created_at)`、`products(model_id)`
- [x] 1.4 运行 Drizzle migration

## 2. 模特库 API

- [x] 2.1 新增 `GET /api/models`：返回当前客户自己的模特列表
- [x] 2.2 新增 `POST /api/models`：上传模特图到 R2 并写入 `customer_models`
- [x] 2.3 模特图 URL 统一写 `/api/files/{key}` 或 `R2_PUBLIC_DOMAIN` 公网地址

## 3. 产品提交绑定

- [x] 3.1 修改产品 schema / API 返回，暴露 `modelId`
- [x] 3.2 修改 `submitProductToQueue`：若产品未绑定模特，则从当前客户的激活模特中随机选择一个
- [x] 3.3 已绑定模特时复用原绑定，不在每次生成时重选
- [x] 3.4 若模特不属于当前客户或客户无可用模特，则提交失败

## 4. Worker 编排

- [x] 4.1 扩展 orchestration context：读取 `products.modelId -> customer_models`
- [x] 4.2 修改 `scene_planning`：将模特图片和模特描述写入 planning context / metadata
- [x] 4.3 修改 `scene_render`：优先使用产品绑定模特而不是临时 `modelImage`
- [x] 4.4 保留 legacy `modelImage` 作为兼容回退

## 5. 测试与修复

- [x] 5.1 提交链路测试：自动绑定、复用绑定、无模特报错、客户隔离
- [x] 5.2 orchestration 测试：scene planning / render 使用产品绑定模特
- [x] 5.3 编译验证与本地 DB migration 验证
