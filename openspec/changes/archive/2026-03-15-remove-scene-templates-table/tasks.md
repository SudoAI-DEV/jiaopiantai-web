## 1. Schema 清理

- [x] 1.1 从 `src/lib/db/schema-pg.ts` 中删除 `sceneTemplates` 表定义和 `SceneTemplate` 类型导出
- [x] 1.2 运行 `drizzle-kit generate` 生成 DROP TABLE migration
- [x] 1.3 在本地数据库执行 migration 验证 (`drizzle-kit migrate`)

## 2. 前端重命名

- [x] 2.1 `new-product-form.tsx`: 将 prop `sceneTemplates` 重命名为 `scenes`，更新所有内部引用
- [x] 2.2 `page.tsx`: 将传入的 prop 名从 `sceneTemplates` 改为 `scenes`

## 3. 验证

- [x] 3.1 运行 ESLint 确认无报错
- [x] 3.2 运行 `next build` 确认构建通过
