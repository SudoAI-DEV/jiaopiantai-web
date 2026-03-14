## Why

后台管理页面（`/admin/*`）缺少页面级 SEO metadata，且没有设置 `robots: noindex`，导致：
1. 所有 admin 页面继承根 layout 的 `index: true`，可能被搜索引擎索引（敏感数据泄露风险）
2. 每个页面的 `<title>` 都是默认的「蕉片台 - AI 商品图片生成服务」，无法区分不同管理页面
3. 动态页面（客户详情、产品审核）缺少 `generateMetadata` 来反映具体内容

## What Changes

- 在 `admin/layout.tsx` 中添加 `metadata` 导出，统一设置 `robots: { index: false, follow: false }` 阻止索引
- 为所有 admin 静态页面添加 `metadata` 导出（包含 title）：
  - `/admin` → "管理后台"
  - `/admin/products` → "产品管理"
  - `/admin/customers` → "客户管理"
  - `/admin/credits` → "点数管理"
  - `/admin/styles` → "风格模板管理"
- 为动态页面添加 `generateMetadata` 函数：
  - `/admin/customers/[id]` → "客户名 - 客户详情"
  - `/admin/products/[id]/review` → "产品名 - 产品审核"

## Capabilities

### New Capabilities
- `admin-seo`: 后台页面 SEO 元数据管理，包含 robots noindex、页面 title、动态 metadata 生成

### Modified Capabilities

## Impact

- 影响文件：`src/app/admin/` 下所有 `layout.tsx` 和 `page.tsx`（共 7 个文件）
- 所有页面已经是 SSR（async server components），metadata 导出天然支持 SSR
- 无破坏性变更，仅增加 metadata 导出
