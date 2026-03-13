# 蕉片台 (Jiaopiantai) — 项目计划书

> **项目名称**: 蕉片台 — AI 商品图片生成服务平台
> **域名**: jiaopiantai.com
> **技术栈**: Next.js (React) + Drizzle ORM + PostgreSQL + Better Auth
> **项目管理**: OpenSpec (Spec-Driven Development)
> **前端设计规范**: Impeccable (pbakaus/impeccable)
> **目标用户**: 服装店、饰品店等有商品拍摄需求的中小商家

---

## 一、项目概述

### 1.1 业务背景

传统商品拍摄流程：找模特 → 拍摄 → 修图公司修图，成本高、周期长。

蕉片台提供的解决方案：
- 客户只需上传几张产品原始照片
- 填写拍摄需求，选择预设风格
- 平台使用 AI（Nano Banana 模型）自动生成商品图
- 内部人工审核把关质量后交付给客户

### 1.2 核心业务流程

```
客户注册 → 线下沟通购买 → 管理员后台充值点数 → 新建产品 → 上传图片/填写需求 → 消耗点数提交 →
AI 异步生成（约20张） → 管理员审核筛选 → 交付客户（约6张精选）
```

### 1.3 服务模式说明

本平台 **不是自助型** AI 生成平台，而是一个 **半自动化的服务交付平台**：
- 客户端：提交需求、查看成品
- AI 端：异步拉取任务并生成图片（独立于本网站）
- 管理端：审核图片、管理客户、管理配额

---

## 二、用户角色与权限

### 2.1 角色定义

| 角色 | 说明 | 权限 |
|------|------|------|
| **客户 (Customer)** | 注册商家用户 | 新建产品、上传图片、填写需求、消耗点数、查看审核通过的成品图 |
| **管理员 (Admin)** | 内部运营人员 | 查看所有客户、管理客户信息、充值点数、审核生成图片、标注问题、触发重新生成、查看平台统计数据 |

### 2.2 认证方案

- 使用 **Better Auth** 进行用户认证
- 支持邮箱 + 密码注册登录
- 可选：手机号验证码登录（通过 Spug 推送助手）
- 管理员账号由管理员在后台手动创建
- 基于 **Drizzle ORM + Next.js 中间件** 实现数据隔离与权限控制

---

## 三、功能模块详细设计

### 3.1 落地页 (Landing Page)

- **Hero 区**: 全幅 AI 生成商品大图，一句话价值主张，CTA 按钮
- **Before/After 对比区**: 滑动对比展示
- **服务流程区**: 4 步流程展示
- **风格展示区**: 网格/瀑布流展示可选风格模板
- **数据亮点区**: 数字滚动动画
- **客户评价区**: 真实客户好评卡片
- **定价说明区**: 简洁，不展示具体价格
- **CTA + 联系方式区**: 微信二维码、联系电话

### 3.2 客户端功能

- **注册/登录**: 邮箱注册，填写基本信息（店铺名称、联系方式、主营类目）
- **客户仪表盘**: 显示剩余点数余额、产品列表、快捷入口
- **新建产品**:
  - 自动分配唯一产品编号（格式：`{年份后两位}{4位序号}`，如 `260001`）
  - 填写产品信息（名称、类目、描述、拍摄需求、风格选择、特别注意事项）
  - 上传产品原始图片（支持批量上传、JPG/PNG/WEBP）
- **产品提交与点数消耗**: 草稿 → 提交（冻结1点数）
- **查看产品结果**: 核对面板（快捷键支持：←/→/J/K/F/D/Space）
- **客户反馈功能**: 预设问题标签 + 自定义文字描述
- **下载功能**: 单张下载、批量下载 ZIP

### 3.3 管理端功能

- **管理员仪表盘**: 平台概览统计、待处理任务列表
- **客户管理**: 列表、详情、新建、编辑、充值点数
- **产品管理**: 全局视角、筛选、查看详情
- **图片审核**: 
  - 瀑布流展示所有生成图
  - 快捷键支持：←/→/J/K/A/R/T/F
  - 操作：✅通过 / ❌淘汰 / 🔄需重新生成
  - 拖拽排序已通过图片
  - "确认交付"按钮

### 3.4 产品状态流转

```
草稿(draft) → 已提交(submitted) → 入队(queued) → 生成中(processing)
 → 待审核(reviewing) → 待客户核对(client_reviewing)
 → 已完成(completed)
客户反馈(feedback_received) → 返工(reworking) → 重新审核
失败(failed) → 点数退还
取消(cancelled) → 点数退还
```

---

## 四、技术架构设计

### 4.1 技术栈

```
├── Next.js 14+ (App Router)
├── React 18+
├── TypeScript
├── Tailwind CSS + shadcn/ui
├── React Hook Form + Zod
├── Drizzle ORM
├── Better Auth
├── Zustand (轻量状态管理)
├── react-dropzone (文件上传)
├── Framer Motion (动画)
└── next-intl (国际化，预留中文)
```

### 4.2 项目管理 — OpenSpec

```
.openspec/
├── spec/ # 系统规格文档
│   ├── system-overview.md
│   ├── auth.md
│   ├── products.md
│   ├── credits.md
│   ├── review.md
│   └── delivery.md
├── proposals/ # 变更提案
└── archive/ # 已完成提案归档
```

### 4.3 前端设计规范 — Impeccable

使用 Impeccable 确保 AI 生成的 UI 具有专业品质：
- 字体：选择有辨识度的字体组合
- 色彩：使用 OKLCH 色彩空间，构建品牌专属色板
- 布局：杂志/编辑式排版，注重留白
- 动效：有目的的微动画

### 4.4 数据库 — PostgreSQL (阿里云 ECS 自建)

核心表结构：
- `profiles` — 客户信息表
- `credit_transactions` — 点数流水表
- `products` — 产品表
- `product_source_images` — 产品原始图片表
- `product_generated_images` — AI 生成图片表
- `image_feedbacks` — 图片反馈表
- `style_templates` — 风格模板表
- `product_style_selections` — 产品风格选择表
- `review_actions` — 审核操作审计表
- `delivery_batches` — 交付批次表
- `delivery_images` — 交付图片明细表
- `operation_logs` — 操作审计日志表
- `ai_generation_tasks` — AI 生成任务表

### 4.5 文件存储 — 阿里云 OSS

- 用户上传的原始图片 → 阿里云 OSS
- AI 生成的成品图 → 阿里云 OSS
- 通过预签名 URL 实现安全上传

---

## 五、页面路由设计

### 5.1 客户端路由
```
/ → 落地页
/login → 登录页
/register → 注册页
/dashboard → 客户仪表盘
/products → 产品列表
/products/new → 新建产品
/products/[id] → 产品详情
/profile → 个人信息
/credits → 点数明细
```

### 5.2 管理端路由
```
/admin → 管理员仪表盘
/admin/customers → 客户列表
/admin/customers/[id] → 客户详情
/admin/products → 全部产品列表
/admin/products/[id]/review → 图片审核页面
/admin/credits → 充值管理
/admin/styles → 风格模板管理
```

---

## 六、开发阶段规划

### Phase 1：基础框架搭建
- [ ] 初始化 Next.js 项目 + TypeScript + Tailwind + shadcn/ui
- [ ] 安装 Impeccable 设计规范
- [ ] 初始化 OpenSpec + 编写初始系统规格
- [ ] 阿里云 ECS 部署 PostgreSQL + Drizzle ORM 配置
- [ ] Better Auth 集成
- [ ] 基础布局组件
- [ ] 路由保护中间件
- [ ] 阿里云 OSS SDK 集成
- [ ] 落地页开发

### Phase 2：客户端核心功能
- [ ] 客户注册流程
- [ ] 客户仪表盘
- [ ] 新建产品页面
- [ ] 产品列表页面
- [ ] 产品详情页面
- [ ] 点数余额展示 + 消耗确认
- [ ] 成品图查看 + 下载

### Phase 3：管理端核心功能
- [ ] 管理员仪表盘
- [ ] 客户管理
- [ ] 点数充值功能
- [ ] 产品管理
- [ ] 图片审核功能
- [ ] 审核后交付确认

### Phase 4：AI 对接与流程打通
- [ ] AI 任务表 + 状态管理
- [ ] AI 服务轮询接口
- [ ] AI 生成结果上传
- [ ] 端到端流程测试

### Phase 5：体验优化
- [ ] 移动端适配
- [ ] 图片加载优化
- [ ] 操作反馈优化

### Phase 6：上线前完善
- [ ] 错误处理
- [ ] 日志与监控
- [ ] 性能优化
- [ ] 安全审查
- [ ] 部署 + 域名配置

---

## 七、部署架构

```
前端 (Next.js) → Vercel
数据库 (PostgreSQL) → 阿里云 ECS 自建
图片存储 → 阿里云 OSS
AI 生成服务 → 独立部署（轮询数据库拉取任务）
DNS → Cloudflare
```

---

## 八、关键业务逻辑

### 8.1 点数消耗逻辑（冻结 → 确认 模式）

- **提交时**: 冻结 1 点数（credits_balance - 1, credits_frozen + 1）
- **完成时**: 确认扣除（credits_frozen - 1）
- **取消/失败时**: 退还点数（credits_balance + 1, credits_frozen - 1）

### 8.2 图片审核与交付流程

1. 管理员审核每张图片（通过/淘汰/需重新生成）
2. 有"需重新生成"则创建新任务（batch_number + 1）
3. 通过数量 >= 客户要求数量时，管理员点击"确认交付"
4. 产品状态变为 'client_reviewing'
5. 客户核对：无问题 → completed；有反馈 → feedback_received

---

## 九、API 设计

### 客户端 API
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/[...all]` | ALL | Better Auth 认证端点 |
| `/api/products` | GET/POST | 获取/新建产品 |
| `/api/products/[id]` | GET/PATCH | 获取/更新产品 |
| `/api/products/[id]/submit` | POST | 提交产品 + 冻结点数 |
| `/api/products/[id]/feedback` | POST | 提交图片反馈 |
| `/api/upload/presigned-url` | POST | 获取 OSS 预签名上传 URL |
| `/api/credits` | GET | 获取点数余额和流水 |

### 管理端 API
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/admin/credits/recharge` | POST | 给客户充值点数 |
| `/api/admin/products/[id]/deliver` | POST | 确认交付产品 |
| `/api/admin/images/[id]/review` | PATCH | 更新图片审核状态 |

---

## 十、当前优先级 (fix_plan.md)

请查看 `.ralph/fix_plan.md` 获取当前待办事项。

---

## 十一、项目结构

```
jiaopiantai/
├── .openspec/ # OpenSpec 规格驱动开发
├── .cursor/ # Impeccable 设计规范
├── public/
├── src/
│   ├── app/
│   │   ├── (marketing)/ # 落地页
│   │   ├── (auth)/ # 认证页面
│   │   ├── (customer)/ # 客户端页面
│   │   ├── (admin)/ # 管理端页面
│   │   └── api/ # API Routes
│   ├── components/
│   │   ├── ui/ # shadcn/ui 组件
│   │   ├── review/ # 共享审核组件
│   │   └── shared/ # 共享业务组件
│   ├── lib/
│   │   ├── db/ # Drizzle ORM
│   │   ├── auth.ts # Better Auth
│   │   └── oss/ # 阿里云 OSS
│   └── hooks/
├── drizzle/ # Drizzle 迁移
└── package.json
```

---

## 十二、待确认事项

| # | 问题 |
|---|------|
| 1 | 每个产品默认交付几张图片？固定 6 张还是可配置？ |
| 2 | 客户登录方式：邮箱、手机号、还是微信扫码？ |
| 3 | AI 生成每个产品大约需要多长时间？ |
| 4 | 风格模板是固定还是需要动态管理？ |
| 5 | 是否需要对接微信公众号/小程序？ |

---

*文档版本: v1.0 | 最后更新: 2026-03-12*
