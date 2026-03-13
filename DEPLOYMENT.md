# 蕉片台 - 部署指南

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

## 部署步骤

### 1. 准备工作

#### 1.1 克隆代码
```bash
git clone https://github.com/your-repo/jiaopiantai.git
cd jiaopiantai
```

#### 1.2 安装依赖
```bash
npm install
```

#### 1.3 配置环境变量
```bash
cp .env.example .env.local
# 编辑 .env.local 填入实际配置
```

### 2. 数据库设置

#### 2.1 阿里云 ECS PostgreSQL
1. 在阿里云 ECS 实例上安装 PostgreSQL 16
2. 创建数据库和用户
3. 配置安全组规则允许 5432 端口

#### 2.2 运行数据库迁移
```bash
npx prisma migrate deploy
npx prisma generate
```

### 3. Vercel 部署

#### 3.1 连接 GitHub
1. 登录 [Vercel](https://vercel.com)
2. 导入 GitHub 仓库

#### 3.2 配置环境变量
在 Vercel 项目设置中添加以下环境变量：
- `DATABASE_URL` - PostgreSQL 连接字符串
- `BETTER_AUTH_SECRET` - 认证密钥
- `BETTER_AUTH_URL` - 生产域名
- `ALIYUN_OSS_*` - 阿里云 OSS 配置

#### 3.3 部署
```bash
vercel deploy --prod
```

### 4. 阿里云 OSS 配置

1. 创建 OSS Bucket
2. 设置 CORS 允许 Vercel 域名
3. 配置访问策略

### 5. 域名配置

#### 5.1 DNS 设置
在域名服务商添加 CNAME 记录：
```
CNAME jiaopiantai.com -> cname.vercel-dns.com
```

#### 5.2 Vercel 域名配置
在 Vercel 项目设置中添加自定义域名

## 本地开发

### Docker 本地开发
```bash
docker-compose up -d
```

### 传统方式
```bash
# 启动 PostgreSQL
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16

# 启动开发服务器
npm run dev
```

## 部署检查清单

- [ ] 数据库迁移完成
- [ ] 环境变量配置正确
- [ ] OSS Bucket 创建并配置
- [ ] 域名解析生效
- [ ] HTTPS 证书自动签发
- [ ] 管理员账号创建

## 常见问题

### Q: 数据库连接失败
A: 检查 DATABASE_URL 格式和安全组规则

### Q: 图片无法上传
A: 检查 OSS CORS 配置和 AccessKey 权限

### Q: 登录失败
A: 确保 BETTER_AUTH_URL 与实际域名一致
