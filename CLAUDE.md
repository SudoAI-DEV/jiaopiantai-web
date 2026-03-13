# 蕉片台 (Jiaopiantai) - AI 商品图片生成服务平台

## 项目背景

- **项目名称**: 蕉片台
- **域名**: jiaopiantai.com
- **业务模式**: B2B AI 商品图生成服务 - 客户上传产品照片，平台使用 AI 生成专业商品图
- **目标用户**: 服装店、饰品店等有商品拍摄需求的中小商家

## 技术栈

- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS v4 + shadcn/ui
- Drizzle ORM
- Better Auth
- Zustand (状态管理)
- 阿里云 OSS (文件存储)
- 阿里云 ECS PostgreSQL (数据库)

---

## 环境配置

### 域名
- **生产域名**: https://jiaopiantai.com
- **测试/开发**: https://jiaopiantai-web.vercel.app (Vercel 自动分配)

### Vercel
- **项目名**: jiaopiantai
- **团队**: SudoAI-DEV
- **GitHub**: https://github.com/SudoAI-DEV/jiaopiantai-web
- **生产环境**: https://vercel.com/sudoai-devs-projects/jiaopiantai

### 数据库

| 环境 | 类型 | 连接信息 |
|------|------|----------|
| 开发 (local) | PostgreSQL | `postgresql://postgres:postgres@localhost:5554/jiaopiantai` |
| 测试 (Neon) | Neon PostgreSQL | `neondb` (pooler: ep-mute-cell-ad5uha1f-pooler.c-2.us-east-1.aws.neon.tech) |
| 生产 (阿里云) | 阿里云 ECS PostgreSQL | 待确认 |

- **Neon 项目 ID**: summer-bonus-06642933
- **Neon 凭证**: 存储在 .env.test (不提交)

### 阿里云 OSS
- **Bucket**: jiaopiantai-images
- **Region**: oss-cn-hangzhou
- **公共域名**: https://images.jiaopiantai.com (如配置)
- **凭证**: 存储在 Vercel 环境变量中

### API 服务
- **内部 API Key**: 用于 AI 服务调用
- **AI Service URL**: 可配置 (本地开发时 http://localhost:8080)

---

## 环境变量

### 必需变量
```
DATABASE_URL          # PostgreSQL 连接字符串
BETTER_AUTH_SECRET    # 认证密钥 (openssl rand -base64 32)
BETTER_AUTH_URL       # 生产域名: https://jiaopiantai.com
ALIYUN_OSS_ACCESS_KEY_ID
ALIYUN_OSS_ACCESS_KEY_SECRET
ALIYUN_OSS_BUCKET=jiaopiantai-images
ALIYUN_OSS_REGION=oss-cn-hangzhou
INTERNAL_API_KEY     # 内部 API 调用密钥
```

### 本地开发
```bash
cp .env.example .env.local
# 开发连接本地 PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5554/jiaopiantai
```

### 测试环境
```bash
# 使用 Neon 免费层
DATABASE_URL=postgresql://neondb_owner:npg_xxx@ep-mute-cell-xxx-pooler.c-2.us-east-1.aws.neon.tech/neondb
```

### 生产环境
```bash
# 使用阿里云 ECS PostgreSQL
DATABASE_URL=postgresql://user:password@ecs-ip:5432/jiaopiantai
```

---

## 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户访问                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (前端 + SSR)                      │
│                   https://jiaopiantai.com                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────────┐   ┌─────────────────────┐
│   阿里云 ECS        │   │    阿里云 OSS      │
│  (PostgreSQL)      │   │  (图片存储)        │
│                    │   │                    │
└─────────────────────┘   └─────────────────────┘
```

---

## Design Context

### Users

目标用户是中小商家（服装、饰品店），他们：
- 缺乏专业摄影设备和团队
- 希望通过低成本获得高质量商品图
- 需要简单的操作流程，不需要复杂的后期修图
- 重视交付效率和图片质量

**用户使用场景**：
1. 线下沟通购买后获得点数
2. 上传产品照片 + 填写需求
3. 等待 AI 生成（约 20 张）
4. 管理员审核筛选（约 6 张）
5. 客户核对并下载成品

### Brand Personality

**品牌个性**：专业、可信赖、简洁、高效

- **专业**：展示 AI 能力和服务流程，让客户放心
- **可信赖**：透明的服务流程，明确的交付标准
- **简洁**：操作简单，不让客户感到困惑
- **高效**：快速响应，帮助客户节省时间

### Aesthetic Direction

**视觉风格**：高端杂志风格 + 品牌辨识度

- **配色方案**：
  - 主色：香蕉黄 `#FDD835` (温暖、活力、年轻)
  - 辅助色：深棕 `#4E342E` (稳重、专业)
  - 背景：米白 `#FFF8E1` / 浅灰
  - 强调色：暖橙 `#FF9800`

- **字体选择**：
  - 中文：思源黑体 (Noto Sans SC) - 现代简洁
  - 英文：Inter 或 Geist - 科技感

- **布局特点**：
  - 杂志式排版，注重留白
  - 大图展示，强调视觉冲击力
  - 清晰的层级结构

### Design Principles

1. **图片优先**：商品图是核心，展示区要大而清晰
2. **操作简单**：减少步骤，让客户专注于产品内容
3. **流程透明**：清晰展示服务流程和状态
4. **信任构建**：展示专业性，建立客户信任
5. **响应迅速**：快速加载，及时反馈

---

## 开发约定

### 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── (marketing)/       # 落地页
│   ├── (auth)/            # 认证页面
│   ├── (customer)/        # 客户端页面
│   ├── (admin)/           # 管理端页面
│   └── api/               # API Routes
├── components/
│   ├── ui/                # shadcn/ui 组件
│   ├── review/            # 共享审核组件
│   └── shared/            # 共享业务组件
├── lib/
│   ├── db/                # Drizzle ORM
│   ├── auth.ts            # Better Auth
│   └── oss/               # 阿里云 OSS
└── hooks/                 # 自定义 Hooks
```

### 数据库

- 当前使用 SQLite (开发环境)
- 生产环境切换到 PostgreSQL (阿里云 ECS)

### 认证

- Better Auth 邮箱 + 密码登录
- 角色：customer (客户) / admin (管理员)
- 管理员账号由后台手动创建
