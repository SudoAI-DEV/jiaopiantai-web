## Context

花姐&寅寅客户在旧版流程中已产出大量 AI 生成图片，存储在本地文件系统 `客户/花姐&寅寅/` 下。目录结构按 订单批次 → 场景风格 → 产品编号 → 生成/batch_xx 组织。现需将这些图片导入系统数据库和 R2 存储，以利用现有 admin review 页面完成审核交付。

当前系统已具备完整的 review 流程：`productGeneratedImages` 表支持 `batchNumber` 字段，admin review 页面支持按批次筛选和审核操作。

目录结构概览：
```
客户/花姐&寅寅/
├── 2026_春夏_第一批/
│   ├── 室外街拍/          (22 products: 2-SJ-01 ~ 2-SJ-22)
│   ├── 都市松弛-已全部交付/ (22 products: 2-DS-05 ~ 2-DS-26)
│   └── 海边艺术-已全部交付/ (15 products: 2-HA-06 ~ 2-HA-20)
├── 2026_春夏_第二批/
│   ├── 田园自然/           (31 products: 2-TR-04 ~ 2-TR-34)
│   └── 艺术建筑/           (16 products: 2-YJ-01 ~ 2-YJ-16)
└── 产品 2/
    ├── 都市松弛/           (4 products: 2-DS-01 ~ 2-DS-04)
    ├── 海边艺术/           (5 products: 2-HA-01 ~ 2-HA-05)
    └── 田园自然/           (3 products: 2-TR-01 ~ 2-TR-03)
```

每个产品目录下：
- 根目录有源图片（`微信图片_*.jpg`）和可选的 `配置.yaml` / `要求.yaml`
- `生成/batch_01/`、`生成/batch_02/` 等子目录包含 AI 生成图片（`scene_xx.png`）
- 部分文件名含备注（如 `scene_02-裤子后侧口袋少了.png`）
- 部分产品目录名含状态标注（如 `2-SJ-13-通过`、`2-SJ-04-需补拍`）

## Goals / Non-Goals

**Goals:**
- 编写一个独立的 TypeScript 脚本，可通过 `npx tsx scripts/import-legacy-images.ts` 运行
- 扫描目录结构，自动解析订单批次、场景风格、产品编号、生成批次
- 为每个产品创建 `products` 记录（使用指定的 userId）
- 上传源图片到 R2 并写入 `product_source_images`
- 上传生成图片到 R2 并写入 `product_generated_images`，保留 `batchNumber`
- 支持 dry-run 模式预览将要执行的操作
- 支持断点续传（跳过已导入的产品）
- 导入后可直接在 admin review 页面进行审核

**Non-Goals:**
- 不修改现有 review 流程代码
- 不处理 `场景`、`风格参考`、`models` 等非生产目录
- 不自动创建客户账号（userId 需提前准备好）
- 不处理缩略图生成（review 页面可直接使用原图）

## Decisions

### 1. 脚本形态：独立 TypeScript 脚本

**选择**: 放在 `scripts/import-legacy-images.ts`，使用 `tsx` 运行
**理由**: 一次性导入任务，不需要常驻服务。直接复用项目的 Drizzle ORM 和 R2 工具函数。
**替代方案**: API 端点 — 过于复杂，不适合批量操作；Python 脚本 — 无法复用现有 TypeScript 工具。

### 2. 产品命名与分组

**选择**: `products.name` 格式为 `{订单批次}-{场景风格}-{产品编号}`，如 `第一批-室外街拍-2-SJ-01`
- `products.productNumber` = 产品编号，如 `2-SJ-01`
- `products.category` = 场景风格，如 `室外街拍`
- `products.stylePreference` = 订单批次，如 `2026_春夏_第一批`
- `products.specialNotes` = 目录名中的状态标注，如 `通过`、`需补拍`
**理由**: 充分利用现有字段，无需修改 schema。在 admin 列表中一眼可识别产品来源。

### 3. R2 文件路径规划

**选择**: 使用现有 `generateFileKey` 函数的路径模式：
- 源图片: `source/{userId}/{productId}/{fileName}`
- 生成图片: `generated/{userId}/{productId}/{fileName}`
**理由**: 与系统现有路径约定一致。

### 4. 产品 status 设置

**选择**: 导入后 product status 设为 `reviewing`，generated images 的 reviewStatus 设为 `pending`
**理由**: 这样 admin review 页面可以立即看到并处理这些产品。

### 5. 并发控制

**选择**: 上传并发数限制为 5，防止 R2 限速
**理由**: 约 2299 张图片 + 源图片，需要控制并发避免超时。

## Risks / Trade-offs

- **[大量重复运行]** → 通过 productNumber 检查去重，跳过已存在的产品
- **[userId 不存在]** → 脚本启动时校验 userId 存在性，不存在则报错退出
- **[R2 上传失败]** → 单张失败记录日志并继续，最终汇总失败数量
- **[磁盘空间]** → 脚本只读取本地文件并上传，不做本地拷贝
