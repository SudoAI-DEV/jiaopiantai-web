## Purpose

定义产品在创建时的系统身份生成规则，确保名称、批次和场景语义由系统统一生成并持久化。

## Requirements

### Requirement: 系统在产品创建时自动生成产品名称

系统 SHALL 在创建产品时服务端生成 `products.name`，不得依赖客户手动输入产品名称。

#### Scenario: 使用产品编号、批次和场景生成名称

- **WHEN** 客户提交新产品，且请求中包含有效的批次信息和已选场景
- **THEN** 系统 SHALL 先生成 `productNumber`
- **AND** 系统 SHALL 使用 `productNumber`、`batchNumber` 与所选场景名称生成 `products.name`
- **AND** 生成后的名称 SHALL 按统一格式保存并返回给客户端

#### Scenario: 客户端传入产品名称

- **WHEN** 客户端请求中仍包含 `name`
- **THEN** 系统 SHALL 忽略客户端传入的名称
- **AND** 系统 SHALL 仍以服务端规则生成并持久化 `products.name`

#### Scenario: 未传批次时使用默认批次

- **WHEN** 客户提交新产品时未显式传入 `batchNumber`
- **THEN** 系统 SHALL 使用默认批次 `1`
- **AND** 生成后的产品名称 SHALL 包含默认批次信息

### Requirement: 系统保存可读的场景身份信息

系统 SHALL 在创建产品时同时保存场景标识和可读场景语义，以支持产品展示和下游生成链路。

#### Scenario: 使用有效场景创建产品

- **WHEN** 客户提交的已选场景 ID 对应到有效的场景配置
- **THEN** 系统 SHALL 将场景 ID 写入 `products.selectedStyleId`
- **AND** 系统 SHALL 将场景名称或等效可读场景语义写入 `products.stylePreference`
- **AND** 自动生成的产品名称 SHALL 使用该可读场景名称

#### Scenario: 场景不存在

- **WHEN** 客户提交的场景 ID 无法匹配到有效场景配置
- **THEN** 产品创建 SHALL 失败
- **AND** 系统 SHALL 返回明确错误，提示选择有效场景

### Requirement: 新建产品界面不再要求手填名称

客户新建产品界面 SHALL 以系统自动命名为默认行为，并把批次与场景作为产品身份输入的一部分。

#### Scenario: 创建表单展示自动命名模式

- **WHEN** 客户打开新建产品页面
- **THEN** 页面 SHALL NOT 要求输入手动产品名称
- **AND** 页面 SHALL 提供批次输入或默认批次值
- **AND** 页面 SHALL 要求客户选择场景后再创建产品

#### Scenario: 创建成功后展示系统生成名称

- **WHEN** 产品创建成功并跳转到列表或详情页
- **THEN** 客户看到的产品名称 SHALL 为系统生成后的名称
- **AND** 页面 SHALL NOT 回退显示一个空名称或临时占位名
