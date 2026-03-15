## ADDED Requirements

### Requirement: 全屏审核弹窗入口
管理员在产品审核页面点击任意生成图片时，系统 SHALL 打开全屏审核弹窗，展示该图片的大图视图。

#### Scenario: 点击图片打开弹窗
- **WHEN** 管理员在审核页面点击任意生成图片
- **THEN** 系统打开全屏审核弹窗，弹窗尺寸为 95vw × 95vh
- **AND** 弹窗内展示被点击图片的高清大图
- **AND** 弹窗顶部显示当前图片序号和待审核总数（如 "3/20 待审核"）

#### Scenario: 关闭弹窗
- **WHEN** 管理员按 Esc 键或点击弹窗关闭按钮
- **THEN** 弹窗关闭，回到审核列表页面
- **AND** 列表页面反映已完成的审核操作

### Requirement: 图片缩放和拖拽
弹窗内的 AI 生成大图 SHALL 支持缩放和拖拽平移操作，方便管理员检查纹路、纽扣、领口等细节。

#### Scenario: 鼠标滚轮缩放
- **WHEN** 管理员在图片区域滚动鼠标滚轮
- **THEN** 图片以鼠标位置为中心进行缩放
- **AND** 缩放范围限制在 0.5x 到 5x 之间

#### Scenario: 拖拽平移
- **WHEN** 管理员在缩放后的图片上按住鼠标拖拽
- **THEN** 图片跟随鼠标移动，显示被遮挡的区域

#### Scenario: 双击放大/重置
- **WHEN** 管理员双击图片
- **THEN** 如果当前缩放为 1x，则放大到 2x 并以双击位置为中心
- **AND** 如果当前缩放不为 1x，则重置为 1x 适应窗口

#### Scenario: 缩放控制按钮
- **WHEN** 管理员点击缩放控制按钮
- **THEN** "适应窗口" 按钮将图片缩放至完整显示
- **AND** "100%" 按钮将图片缩放至原始尺寸
- **AND** "200%" 按钮将图片放大至 2 倍
- **AND** "+" 按钮每次放大 0.25x
- **AND** "-" 按钮每次缩小 0.25x

### Requirement: 原图对比展示
弹窗 SHALL 采用左右分栏布局，左侧展示 AI 生成图大图，右侧展示产品原图列表面板，方便管理员并排对比核实细节。

#### Scenario: 左右分栏布局
- **WHEN** 审核弹窗打开时
- **THEN** 弹窗左侧为 AI 生成图大图区域（占据主要空间，支持缩放拖拽）
- **AND** 弹窗右侧为 280px 宽的原图参考面板
- **AND** 右侧面板显示标题 "原图参考 (N)"，N 为原图数量

#### Scenario: 展示原图列表
- **WHEN** 审核弹窗打开时
- **THEN** 右侧面板以较大尺寸纵向排列展示该产品所有原图
- **AND** 原图列表可垂直滚动浏览
- **AND** 每张原图可点击

#### Scenario: 点击原图放大查看
- **WHEN** 管理员点击右侧面板中的某张原图
- **THEN** 该原图以覆盖层方式全屏放大展示
- **AND** 管理员可对原图进行缩放和拖拽操作
- **AND** 点击空白处或按 Esc 关闭原图覆盖层

### Requirement: 审核通过操作
管理员 SHALL 能够在弹窗中将当前图片标记为审核通过。

#### Scenario: 点击通过按钮
- **WHEN** 管理员点击 "通过" 按钮或按 A 键
- **THEN** 系统调用 PATCH /api/admin/images/{id}/review 将状态设为 approved
- **AND** 显示简短成功提示
- **AND** 自动切换到下一张待审核图片

#### Scenario: 已审核图片不可重复操作
- **WHEN** 当前图片已被审核（非 pending 状态）
- **THEN** 操作按钮显示为禁用状态
- **AND** 显示当前审核状态标签

### Requirement: 驳回操作与预设理由
管理员 SHALL 能够在弹窗中驳回图片并选择/填写驳回理由。

#### Scenario: 驳回并选择预设理由
- **WHEN** 管理员点击 "驳回" 按钮或按 R 键
- **THEN** 展开驳回理由面板，显示预设理由复选框列表
- **AND** 预设理由至少包含：裁切问题、模特不自然、纹路偏差、颜色偏差、背景不合适、变形/畸变、分辨率低、光影不自然、姿势不当、配饰错误、面料质感错误、细节丢失、比例失调、水印/伪影
- **AND** 管理员可多选预设理由

#### Scenario: 驳回并填写自定义理由
- **WHEN** 管理员在驳回理由面板中输入自定义文字
- **THEN** 自定义理由与已选预设理由一起保存

#### Scenario: 确认驳回
- **WHEN** 管理员选择/填写理由后点击 "确认驳回" 按钮
- **THEN** 系统调用 PATCH /api/admin/images/{id}/review 将状态设为 rejected
- **AND** 将驳回理由（预设 ID 列表 + 自定义文字）以 JSON 格式存储到 rejectionReason 字段
- **AND** 自动切换到下一张待审核图片

#### Scenario: 驳回必须提供理由
- **WHEN** 管理员未选择任何预设理由且未填写自定义理由时尝试确认驳回
- **THEN** 系统阻止提交并提示 "请选择或填写驳回理由"

### Requirement: 重新生成操作
管理员 SHALL 能够在弹窗中标记图片需要重新生成。

#### Scenario: 标记重新生成
- **WHEN** 管理员点击 "重新生成" 按钮
- **THEN** 系统调用 PATCH /api/admin/images/{id}/review 将状态设为 regenerate
- **AND** 自动切换到下一张待审核图片

### Requirement: 自动翻页
审核操作完成后，系统 SHALL 自动导航到下一张待审核图片。

#### Scenario: 审核后自动跳转下一张
- **WHEN** 管理员完成任意审核操作（通过/驳回/重新生成）
- **THEN** 弹窗自动切换到下一张 reviewStatus 为 pending 的图片
- **AND** 图片切换带有平滑过渡效果
- **AND** 缩放状态重置为适应窗口

#### Scenario: 所有图片审核完成
- **WHEN** 当前图片是最后一张待审核图片且管理员完成审核操作
- **THEN** 弹窗显示 "所有图片审核完成" 提示
- **AND** 2 秒后自动关闭弹窗

#### Scenario: 手动导航
- **WHEN** 管理员点击 "上一张"/"下一张" 按钮或按 ← / → 键
- **THEN** 按图片排序切换到相邻图片（包括已审核的图片）

### Requirement: 键盘快捷键
弹窗 SHALL 支持键盘快捷键以提升操作效率。

#### Scenario: 快捷键操作
- **WHEN** 审核弹窗处于打开状态
- **THEN** A 键或 Enter 键触发 "通过" 操作
- **AND** R 键触发 "驳回"（展开理由面板）
- **AND** ← 键切换到上一张图片
- **AND** → 键切换到下一张图片
- **AND** + 键放大图片
- **AND** - 键缩小图片
- **AND** 0 键重置缩放
- **AND** Esc 键关闭弹窗

#### Scenario: 输入框聚焦时禁用快捷键
- **WHEN** 光标聚焦在自定义驳回理由输入框中
- **THEN** 字母键快捷键（A、R）不触发审核操作
- **AND** Esc 键仅关闭驳回理由面板而非弹窗

### Requirement: 驳回理由数据持久化
系统 SHALL 在 product_generated_images 表中存储驳回理由。

#### Scenario: 数据库字段
- **WHEN** 管理员驳回图片时
- **THEN** rejectionReason 字段存储 JSON 格式数据，结构为 `{ "presets": ["crop_issue", "unnatural_model"], "custom": "自定义描述" }`

#### Scenario: API 接收驳回理由
- **WHEN** 前端发送 PATCH /api/admin/images/{id}/review 请求且 status 为 rejected
- **THEN** API SHALL 接受可选的 rejectionReason 参数（JSON 对象）
- **AND** 将其存储到 rejectionReason 字段

#### Scenario: 非驳回状态清空理由
- **WHEN** 管理员将已驳回图片重新设为其他状态
- **THEN** rejectionReason 字段 SHALL 被清空为 null
