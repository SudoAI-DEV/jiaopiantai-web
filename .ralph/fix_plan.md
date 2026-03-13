# 蕉片台 (Jiaopiantai) 开发计划

## Phase 1：基础框架搭建 ⭐ HIGH PRIORITY
- [x] 初始化 Next.js 项目 + TypeScript + Tailwind + shadcn/ui
- [x] 安装 Impeccable 设计规范：`npx skills add pbakaus/impeccable`
- [x] 初始化 OpenSpec + 编写初始系统规格
- [x] 阿里云 ECS 部署 PostgreSQL + Drizzle ORM 配置 + 初始迁移
- [x] Better Auth 集成（注册/登录/登出/角色管理）
- [x] 基础布局组件（响应式 Header/Sidebar/Footer）
- [x] 路由保护中间件（未登录重定向、角色校验）
- [x] 阿里云 OSS SDK 集成 + 预签名上传封装
- [x] 落地页开发（Hero + Before/After + 流程 + 风格 + CTA）

## Phase 2：客户端核心功能 ⭐ HIGH PRIORITY
- [x] 客户注册流程（带店铺信息）
- [x] 客户仪表盘页面
- [x] 新建产品页面（表单 + 图片上传）
- [x] 产品列表页面（状态筛选、分页）
- [x] 产品详情页面（查看提交信息）
- [x] 点数余额展示 + 消耗确认流程
- [x] 成品图查看 + 下载功能

## Phase 3：管理端核心功能 ⭐ HIGH PRIORITY
- [x] 管理员仪表盘
- [x] 客户管理（列表/详情/新建/编辑）
- [x] 点数充值功能 + 流水记录
- [x] 产品管理（全局视角）
- [x] 图片审核功能（通过/淘汰/重新生成）
- [x] 审核后交付确认

## Phase 4：AI 对接与流程打通
- [x] AI 任务表 + 状态管理
- [x] AI 服务轮询接口
- [x] AI 生成结果上传 + 记录创建
- [ ] 端到端流程测试

## Phase 5：体验优化
- [x] 移动端适配优化
- [x] 操作反馈优化（Toast 提示、加载状态、骨架屏）
- [x] 图片加载优化（懒加载、缩略图、渐进式加载）
- [x] 产品状态实时推送（WebSocket / SSE）
- [x] 批量操作优化

## Phase 6：上线前完善
- [x] 错误处理完善
- [x] 日志与监控
- [x] 性能优化
- [x] 安全审查
- [x] 部署 + 域名配置
- [x] 用户使用文档

---

## 待确认事项（需要人类确认）
- [ ] 每个产品默认交付几张图片？固定 6 张还是可配置？
- [ ] 客户登录方式：邮箱、手机号、还是微信扫码？
- [ ] AI 生成每个产品大约需要多长时间？（影响前端等待提示设计）
- [ ] 风格模板是固定还是需要动态管理？
- [ ] 是否需要对接微信公众号/小程序？

---

## 技术依赖
- Next.js 14+ (App Router)
- Drizzle ORM
- Better Auth
- 阿里云 OSS
- Impeccable 设计规范
- OpenSpec

---

*更新于: 2026-03-13*
