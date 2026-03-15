## 1. 创建场景常量文件

- [ ] 1.1 创建 `src/lib/scenes.ts`，定义 `SCENES` 常量数组（4 个场景：seaside-art / country-garden / urban-street / architectural-editorial），每个包含 id、name、description、thumbnailUrl（`/scenes/<id>.jpg`）、sceneRef 字段
- [ ] 1.2 导出 `SceneId` 类型（从 SCENES 推导的字面量联合类型）
- [ ] 1.3 导出 `getSceneById(id: string)` 和 `isValidSceneId(id: string)` 工具函数
- [ ] 1.4 添加场景缩略图到 `public/scenes/` 目录（可暂用占位图）

## 2. 修改前端页面

- [ ] 2.1 修改 `src/app/(customer)/products/new/page.tsx`：移除 `getSceneTemplates()` 数据库查询，改为 import `SCENES` 常量传给 `NewProductForm`
- [ ] 2.2 修改 `src/app/(customer)/products/new/new-product-form.tsx`：`SceneTemplate` 接口改为从 `src/lib/scenes.ts` 导入类型，移除数据库类型依赖
- [ ] 2.3 修改 `src/app/admin/styles/page.tsx`：移除 `styleTemplates` 数据库查询，改为 import `SCENES` 常量做只读展示

## 3. 修改 API 路由

- [ ] 3.1 修改 `src/app/api/products/route.ts` POST 方法：引入 `isValidSceneId()`，校验 `stylePreference` 为合法枚举值，非法时返回 400
- [ ] 3.2 修改 `src/lib/validations.ts`：`stylePreference` 校验改为枚举白名单（可选）

## 4. 修改 Workers 生成代码

- [ ] 4.1 修改 `workers/src/lib/orchestration-context.ts`：import `isValidSceneId` / `SCENES`，场景解析链加入枚举校验，非法值 fallback 到默认场景并 console.warn
- [ ] 4.2 修改 `workers/src/lib/orchestration-schemas.ts`：`metadata.scene` 字段从 `z.string()` 改为 `z.enum([...SCENE_IDS])`
- [ ] 4.3 修改 `workers/src/handlers/scene-planning.ts`：使用 `getSceneById()` 获取场景中文名用于 AI 提示词（替代直接使用 string）

## 5. 清理数据库依赖

- [ ] 5.1 从 `src/lib/db/schema-pg.ts` 中移除 `styleTemplates` 表定义和 `StyleTemplate` 类型导出（暂保留表不删，只停止代码引用）
- [ ] 5.2 删除 `scripts/sql/seed-style-templates.sql`
- [ ] 5.3 确认无其他代码引用 `styleTemplates`，全局搜索清理残留 import
