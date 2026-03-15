## Why

花姐&寅寅客户的旧版流程已产出大量 AI 生成图片（约 2299 张），存储在本地文件夹 `客户/花姐&寅寅/` 下。这些图片需要通过系统当前的 review 流程（管理员审核 → 客户核对）进行交付，但当前没有将旧版本地文件导入到系统数据库和 R2 存储的工具。需要一个导入脚本将这些图片按批次写入指定客户的 product 中，以便利用已有的 admin review 页面完成审核。

## What Changes

- 新增一个 TypeScript 导入脚本，扫描 `客户/花姐&寅寅/` 目录结构，将生成图片上传到 R2 并写入 `product_generated_images` 表
- 脚本需根据目录结构自动创建对应的 `products` 记录（如不存在）
- 保留批次信息：目录中的 `batch_01`, `batch_02`, `batch_03` 映射为 `productGeneratedImages.batchNumber`
- 保留产品编号信息：如 `2-SJ-01`, `2-DS-05`, `2-TR-04`, `2-YJ-10` 映射为 `products.productNumber`
- 保留场景/风格分组信息：如 室外街拍、都市松弛、海边艺术、田园自然、艺术建筑，映射为 `products.category` 或 `stylePreference`
- 支持多个订单批次（第一批 / 第二批 / 产品2）的区分，体现在 product name 或 metadata 中
- 源图片（微信图片 jpg）上传到 `product_source_images` 表
- 文件名中的备注信息（如 `-通过`, `-需补拍`, `-裤子后侧口袋少了`）作为 metadata 保留

## Capabilities

### New Capabilities
- `legacy-image-import`: 旧版本地文件系统图片批量导入到系统数据库和 R2 存储的脚本能力，支持按目录结构解析批次、产品编号、场景风格等信息

### Modified Capabilities
<!-- 无需修改现有 spec -->

## Impact

- **数据库**: 向 `products`, `product_source_images`, `product_generated_images` 表写入新记录
- **R2 存储**: 上传约 2299 张生成图片 + 对应的源图片到 Cloudflare R2
- **前提条件**: 需要知道花姐&寅寅客户在系统中的 `userId`，脚本运行时需配置 `.env` 中的数据库和 R2 凭证
- **不影响**: 现有 review 流程代码无需修改，导入后直接使用 admin review 页面操作
