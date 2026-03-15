## 1. 脚本骨架与 CLI 解析

- [x] 1.1 创建 `scripts/import-legacy-images.ts`，实现 CLI 参数解析（`--user-id`, `--base-dir`, `--dry-run`, `--batch-filter`）
- [x] 1.2 添加 userId 校验逻辑：启动时查询数据库确认 userId 存在，不存在则报错退出

## 2. 目录结构扫描与解析

- [x] 2.1 实现目录扫描函数：递归扫描 base-dir，识别 3 层结构（订单批次 → 场景风格 → 产品编号）
- [x] 2.2 实现目录名解析：strip 场景风格后缀（如 `-已全部交付`）、提取产品编号和状态标注（如 `-通过`, `-需补拍`）
- [x] 2.3 实现 batch-filter 过滤：仅处理指定订单批次目录
- [x] 2.4 实现文件分类：区分源图片（根目录 jpg）和生成图片（`生成/batch_XX/scene_XX.png`），跳过非图片文件

## 3. R2 上传与数据库写入

- [x] 3.1 实现 R2 上传函数：读取本地文件并上传到 R2，使用 `generated/{userId}/{productId}/` 和 `source/{userId}/{productId}/` 路径，并发控制为 5
- [x] 3.2 实现 product 创建：为每个产品目录创建 `products` 记录（status=reviewing），根据 productNumber 去重跳过已存在的
- [x] 3.3 实现源图片写入：上传源图片到 R2 并插入 `product_source_images` 记录
- [x] 3.4 实现生成图片写入：上传生成图片到 R2 并插入 `product_generated_images` 记录，设置 `batchNumber` 和 `reviewStatus=pending`

## 4. Dry-run 与报告

- [x] 4.1 实现 dry-run 模式：打印分组汇总（按订单批次 → 场景风格），显示产品数、源图片数、生成图片数（按 batch 分组）
- [x] 4.2 实现完成报告：输出总计创建产品数、上传源图片数、上传生成图片数、失败数

## 5. 测试验证

- [x] 5.1 使用 `--dry-run` 模式验证目录解析结果正确
- [ ] 5.2 选取 1-2 个产品进行实际导入测试，确认 admin review 页面可正常显示和操作
