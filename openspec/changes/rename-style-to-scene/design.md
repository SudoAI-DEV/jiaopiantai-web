## Context

场景（scene）概念已在应用层确立为正式术语，`src/lib/scenes.ts` 定义了 4 个固定场景枚举。但数据库列名、Drizzle ORM 字段名、管理后台路由和部分 UI 文案仍使用旧的 "style/风格" 术语。需要一次性完成全栈术语统一。

当前状态：
- 数据库列：`style_preference`、`selected_style_id`、`style_id`（products 和 ai_generation_tasks 表）
- Drizzle 导出：`stylePreference`、`selectedStyleId`、`styleId`、`styleTemplates`、`productStyleSelections`、`StyleTemplate`
- 路由：`/admin/styles`
- UI 文案：多处"风格模板"、"风格选择"等
- Workers 使用 `product.selectedStyleId` 和 `product.stylePreference`
- 验证枚举：`style_not_match`

## Goals / Non-Goals

**Goals:**
- 数据库列名从 style 统一到 scene（通过 Drizzle 迁移 ALTER COLUMN RENAME）
- Drizzle ORM 字段名和类型导出统一到 scene 术语
- 管理后台路由从 `/admin/styles` 改为 `/admin/scenes`
- 所有面向用户的"风格"文案改为"场景"
- Workers 和测试文件同步更新字段引用
- 验证枚举值统一

**Non-Goals:**
- 不修改历史 Drizzle 迁移文件（它们是不可变记录）
- 不重构场景相关业务逻辑（只做术语重命名）
- 不修改 `src/lib/scenes.ts` 中的场景定义数据
- 不修改 CSS className 或 React `style` prop 中的 style（这些是 CSS 术语，不是业务概念）
- 不做 spec 文件夹名变更（`image-style-analysis` spec 名称保留，内容中的术语更新即可）

## Decisions

### D1: 数据库列使用 ALTER TABLE RENAME COLUMN

**选择**: 使用 PostgreSQL `ALTER TABLE ... RENAME COLUMN` 而非 drop+create。

**理由**: RENAME COLUMN 是原子操作、零停机、不丢数据。Drizzle Kit 可自动生成此迁移。无需双写或回填。

**替代方案**: 新增列+数据迁移+删旧列 — 复杂度高且无必要，RENAME 已足够。

### D2: 废弃表同步重命名

**选择**: `style_templates` → `scene_templates`，`product_style_selections` → `product_scene_selections`，连同其 `style_id` 列 → `scene_id`。

**理由**: 虽然这些表已标记 DEPRECATED，但 schema 定义仍被 Drizzle 追踪，保持术语一致降低后续维护困惑。

### D3: 路由使用文件系统重命名

**选择**: 将 `src/app/admin/styles/` 目录重命名为 `src/app/admin/scenes/`。

**理由**: Next.js App Router 路由由文件系统驱动，重命名目录即可改变路由。无需设置 redirect（管理后台无外部链接依赖）。

### D4: 验证枚举 style_not_match → scene_not_match

**选择**: 更新 feedback type 枚举值。

**理由**: 这是一个枚举字符串值，目前没有已存储的 feedback 数据使用此值（新平台），所以可以直接改。如果有历史数据，应做数据迁移。

### D5: schema-pg.d.ts 重新生成

**选择**: 删除旧 `schema-pg.d.ts`，使用 `tsc --declaration` 或手动更新重新生成。

**理由**: 该文件是 schema-pg.ts 的类型声明，必须与源文件保持同步。

## Risks / Trade-offs

- **[数据库迁移失败]** → 使用 `ALTER TABLE RENAME COLUMN`，PostgreSQL 支持事务性 DDL，迁移失败自动回滚。在本地和测试环境先验证。
- **[Workers 部署时序]** → Workers 和 Web 共享 schema-pg.ts，需同时部署。若分开部署，先部署迁移+Web，Workers 会因字段名不匹配报错 → 建议同一次部署完成迁移+代码更新。
- **[遗漏引用]** → 使用 TypeScript 编译器 (`tsc --noEmit`) 确认所有引用已更新，编译通过即无遗漏。
- **[import-legacy-images.ts 脚本]** → 一次性脚本，更新字段引用即可，不影响生产运行。
