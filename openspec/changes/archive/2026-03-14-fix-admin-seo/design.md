## Context

后台管理页面（`/admin/*`）共 7 个页面文件 + 1 个 layout，全部是 async server components（SSR）。当前所有页面继承根 layout 的 metadata，没有页面级 title 和 robots 配置。

现有文件结构：
- `src/app/admin/layout.tsx` — admin layout（无 metadata 导出）
- `src/app/admin/page.tsx` — 管理后台首页
- `src/app/admin/products/page.tsx` — 产品管理
- `src/app/admin/products/[id]/review/page.tsx` — 产品审核（动态）
- `src/app/admin/customers/page.tsx` — 客户管理
- `src/app/admin/customers/[id]/page.tsx` — 客户详情（动态）
- `src/app/admin/credits/page.tsx` — 点数管理
- `src/app/admin/styles/page.tsx` — 风格模板管理

根 layout (`src/app/layout.tsx`) 已配置 title template: `"%s | 蕉片台"`。

## Goals / Non-Goals

**Goals:**
- 阻止搜索引擎索引所有 admin 页面（`robots: noindex, nofollow`）
- 每个 admin 页面有独立的 `<title>` 便于浏览器标签识别
- 动态页面（客户详情、产品审核）title 包含具体名称

**Non-Goals:**
- 不涉及 Open Graph / Twitter Card 配置（后台页面无需社交分享）
- 不涉及 sitemap 配置
- 不涉及非 admin 页面的 SEO 优化

## Decisions

### 1. robots noindex 设置在 admin layout 层

**选择**: 在 `admin/layout.tsx` 中导出 `metadata` 设置 `robots: { index: false, follow: false }`

**替代方案**: 在每个 page.tsx 中单独设置 robots

**理由**: Next.js metadata 支持层级合并，在 layout 设一次即可覆盖所有子页面，减少重复代码。子页面的 metadata 会与 layout 的 metadata 合并。

### 2. 静态页面用 `metadata` 导出，动态页面用 `generateMetadata`

**选择**: 
- 静态页面（dashboard、products、customers、credits、styles）使用 `export const metadata: Metadata`
- 动态页面（`customers/[id]`、`products/[id]/review`）使用 `export async function generateMetadata()`

**理由**: 静态 metadata 更简洁，动态页面需要从数据库获取名称来生成 title，必须用 `generateMetadata`。Next.js 会自动对 `generateMetadata` 中的 fetch/db 调用做请求去重（Request Memoization），不会导致额外查询。

### 3. 动态页面复用已有数据查询逻辑

**选择**: `generateMetadata` 中直接查询数据库获取名称，而非复用页面的主查询函数

**理由**: Next.js 的 Request Memoization 会自动去重相同的数据库调用。`generateMetadata` 和页面组件的查询会被合并，无性能开销。保持 metadata 逻辑独立简洁。

## Risks / Trade-offs

- **[风险] layout metadata 与 page metadata 合并行为** → Next.js 文档明确支持嵌套 metadata 合并，`robots` 字段在 layout 设置后子页面无需重复。已验证行为符合预期。
- **[风险] 动态页面 generateMetadata 增加数据库查询** → Next.js Request Memoization 确保同一请求中相同查询只执行一次，无额外性能开销。
