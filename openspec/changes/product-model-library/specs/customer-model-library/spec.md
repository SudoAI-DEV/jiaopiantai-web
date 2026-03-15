## ADDED Requirements

### Requirement: 客户私有模特库

系统 SHALL 提供客户私有模特库，模特记录必须绑定到单个客户，且不能跨客户共享。

#### Scenario: 创建模特记录

- **WHEN** 客户上传一张模特图片并提供模特名称、描述
- **THEN** 系统 SHALL 将图片上传到 R2
- **AND** 插入一条 `customer_models` 记录
- **AND** 该记录的 `userId` SHALL 等于当前登录客户
- **AND** 数据库中的图片地址 SHALL 写为 `/api/files/{key}` 或配置的公网地址

#### Scenario: 查询模特列表

- **WHEN** 客户请求自己的模特列表
- **THEN** 系统 SHALL 仅返回 `customer_models.userId = 当前客户` 的记录
- **AND** 不得返回其他客户的模特

#### Scenario: 模特图片文件存在于 R2

- **WHEN** 模特记录创建成功
- **THEN** 对应 R2 object key SHALL 存在
- **AND** 后台和前台页面 SHALL 能通过数据库中的图片地址访问它
