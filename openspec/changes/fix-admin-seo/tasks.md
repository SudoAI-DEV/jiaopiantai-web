## 1. Admin Layout robots noindex

- [ ] 1.1 在 `src/app/admin/layout.tsx` 中添加 `export const metadata: Metadata` 导出，设置 `robots: { index: false, follow: false }`

## 2. 静态页面 metadata

- [ ] 2.1 在 `src/app/admin/page.tsx` 中添加 `export const metadata: Metadata`，title 设为 "管理后台"
- [ ] 2.2 在 `src/app/admin/products/page.tsx` 中添加 `export const metadata: Metadata`，title 设为 "产品管理"
- [ ] 2.3 在 `src/app/admin/customers/page.tsx` 中添加 `export const metadata: Metadata`，title 设为 "客户管理"
- [ ] 2.4 在 `src/app/admin/credits/page.tsx` 中添加 `export const metadata: Metadata`，title 设为 "点数管理"
- [ ] 2.5 在 `src/app/admin/styles/page.tsx` 中添加 `export const metadata: Metadata`，title 设为 "风格模板管理"

## 3. 动态页面 generateMetadata

- [ ] 3.1 在 `src/app/admin/customers/[id]/page.tsx` 中添加 `generateMetadata`，查询客户 shopName 生成 title（fallback: "客户详情"）
- [ ] 3.2 在 `src/app/admin/products/[id]/review/page.tsx` 中添加 `generateMetadata`，查询产品 name 生成 title（fallback: "产品审核"）

## 4. 验证

- [ ] 4.1 运行 `npm run build` 确认无类型错误和构建报错
