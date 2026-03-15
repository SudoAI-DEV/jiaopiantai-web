## Why

场景（海边艺术/自然田园/都市街拍/艺术建筑）目前存储在数据库 `style_templates` 表中，但 AI 图片生成代码（`.agent/skills/`）使用硬编码的场景文件引用（`scene-a-seaside-art.md` 等）。两套系统之间没有共享的枚举，导致场景 ID 不一致时生成侧无法正确关联，且每次部署都需要手动执行 seed SQL。

## What Changes

- **BREAKING**: 删除 `style_templates` 数据库表，场景改为代码内置常量
- 新增 `src/lib/scenes.ts`，定义场景枚举和元数据（id、中文名、描述、缩略图路径、对应的 scene reference 文件名）
- 修改 `/products/new` 页面，从代码常量读取场景列表，不再查询数据库
- 修改 `POST /api/products` 接口，校验 `stylePreference` 必须是合法枚举值
- 修改管理端 `/admin/styles` 页面为只读展示（或移除）
- 修改 `workers/src/lib/orchestration-context.ts`，场景解析从自由字符串改为枚举校验
- 修改 `workers/src/lib/orchestration-schemas.ts`，场景字段改用枚举类型
- `products.stylePreference` 字段保留，存储枚举值字符串
- 删除 `scripts/sql/seed-style-templates.sql`（不再需要）

## Capabilities

### New Capabilities
- `scene-registry`: 统一的场景枚举注册表，定义 4 个场景的 ID、名称、描述、缩略图、关联的生成参考文件，供前端展示和生成代码共同引用

### Modified Capabilities
（无已有 spec 需要修改）

## Impact

- **数据库**: 删除 `style_templates` 表（需 migration）；`products.stylePreference` 列类型不变但值改为枚举字符串
- **前端**: `products/new/page.tsx` 不再查询 DB；`new-product-form.tsx` 接口不变
- **API**: `POST /api/products` 增加枚举校验
- **管理端**: `/admin/styles` 页面需调整或移除
- **生成侧**: `.agent/skills/` 可通过枚举 ID 直接映射到 scene reference 文件
- **Workers**: `orchestration-context.ts` 场景解析改用枚举校验；`orchestration-schemas.ts` 场景字段类型收紧
- **部署**: 不再需要手动执行 seed SQL
