## 1. 客户新建产品表单

- [x] 1.1 移除新建产品页中的手动产品名称输入与对应前端校验
- [x] 1.2 在新建产品表单中补充批次输入，并提供默认值 `1`
- [x] 1.3 调整场景选择提交流程，改为提交 `selectedStyleId`，不再把场景 ID 直接写入 `stylePreference`

## 2. 产品创建 API 与命名逻辑

- [x] 2.1 修改 `POST /api/products` 入参解析，支持 `batchNumber` 与 `selectedStyleId`
- [x] 2.2 在服务端根据 `productNumber`、`batchNumber` 和场景名称生成 `products.name`
- [x] 2.3 创建产品时同时写入 `products.selectedStyleId` 和可读的 `products.stylePreference`
- [x] 2.4 为旧客户端保留兼容路径：忽略传入的 `name`，并兼容旧 `stylePreference` payload

## 3. 展示与验证

- [x] 3.1 确认客户产品列表、详情页展示系统生成后的产品名称
- [x] 3.2 补充创建链路测试：自动命名、默认批次、非法场景 ID 报错、忽略客户端名称
- [x] 3.3 运行相关 lint / test，并验证本地创建产品流程可正常生成名称
