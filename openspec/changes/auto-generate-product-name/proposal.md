## Why

当前新建产品流程仍要求客户手动填写产品名称，但系统其实已经会自动生成 `productNumber`，并且产品还带有批次与场景信息。继续让用户手填名称会造成重复输入、命名不一致，以及后台审核和列表里出现难以识别的产品。

## What Changes

- 移除新建产品页的手动产品名称输入，改为由系统自动生成并写入 `products.name`
- 在创建产品时明确批次来源，使用批次号参与产品名称生成
- 在服务端根据 `productNumber`、`batchNumber` 和所选场景名称生成可读的产品名称
- 创建产品时解析已选场景配置，保存可用于展示和生成链路的可读场景信息，而不是仅保存场景 ID
- 更新创建成功返回值和客户侧列表/详情展示，统一使用系统生成后的产品名称

## Capabilities

### New Capabilities

- `product-generated-identity`: 系统在产品创建时自动生成产品名称，并基于产品编号、批次和场景生成稳定且可读的产品标识

### Modified Capabilities

- None

## Impact

- 受影响前端：`src/app/(customer)/products/new/*`、客户产品列表/详情展示
- 受影响 API：`src/app/api/products/route.ts`
- 受影响数据模型/配置：复用 `products.productNumber`、`products.batchNumber`、`products.name`、`products.selectedStyleId`、`products.stylePreference`，并读取 `src/lib/scenes.ts`
- 需要补充测试：产品创建、自动命名、批次/场景回填、列表展示一致性
