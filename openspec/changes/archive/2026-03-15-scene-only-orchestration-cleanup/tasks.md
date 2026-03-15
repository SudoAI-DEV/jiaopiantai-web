## 1. 提交入口清理

- [x] 1.1 删除产品详情页中的“旧流程配置”面板和相关引用
- [x] 1.2 收紧 `/api/products/[id]/submit`，拒绝 legacy body 并移除 `normalizeGenerationConfig`
- [x] 1.3 修改 `submitProductToQueue()`，首个 `clothing_analysis` payload 显式写入 `scene`，并移除 legacy payload 字段

## 2. 场景真源收紧

- [x] 2.1 收紧 `POST /api/products` 与场景校验，只接受正式场景枚举
- [x] 2.2 收紧 orchestration context 的场景解析，只接受 payload.scene 或产品持久化场景枚举
- [x] 2.3 将应用层文案、变量和注释统一到 scene/场景语义，避免继续扩散 style 命名

## 3. Worker 正式链路清理

- [x] 3.1 清理 `clothing_analysis`、`scene_planning`、`scene_render` 中的 legacy 字段读取和风格文案
- [x] 3.2 移除 `workers/src/index.ts` 中的 legacy handler 注册和旧任务类型提示
- [x] 3.3 评估并清理不再被正式链路使用的 legacy helper 引用

## 4. 验证与同步

- [x] 4.1 更新或新增测试，覆盖 scene-only 提交、严格场景解析和新 worker 链路
- [x] 4.2 运行 `npm run build`
- [x] 4.3 运行 `npm --prefix workers test`
- [x] 4.4 运行 `npm --prefix workers run build`
- [x] 4.5 根据实现结果回填 OpenSpec 任务状态
