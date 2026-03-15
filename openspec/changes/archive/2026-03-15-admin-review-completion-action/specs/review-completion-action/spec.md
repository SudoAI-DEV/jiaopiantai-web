## ADDED Requirements

### Requirement: Admin can complete review action
The system SHALL allow admin users to mark a product review as complete, which changes the product status from "reviewing" to "client_reviewing" and makes generated images visible to the customer.

#### Scenario: Admin completes review with approved images
- **WHEN** admin clicks "完成审核" button on a product with status "reviewing" and has at least one approved image
- **THEN** product status changes to "client_reviewing"
- **AND** product's `reviewedAt` field is set to current timestamp
- **AND** product's `reviewedBy` field is set to admin's user ID

#### Scenario: Admin completes review with confirmation dialog
- **WHEN** admin clicks "完成审核" button
- **THEN** system shows confirmation dialog with message "确定完成审核？完成后客户将可以看到审核通过的图片"
- **AND** when admin confirms, the review is completed

#### Scenario: Admin cannot complete review without approved images
- **WHEN** admin clicks "完成审核" button on a product with no approved images
- **THEN** system shows error message "请先选择至少一张审核通过的图片"
- **AND** product status remains unchanged

#### Scenario: Admin cannot complete review on non-reviewing products
- **WHEN** admin attempts to complete review on a product with status not equal to "reviewing"
- **THEN** system returns error "只有审核中的产品才能完成审核"
- **AND** product status remains unchanged

### Requirement: Customer can view images after review completion
The system SHALL only allow customers to view generated images when the product status is "client_reviewing" or later stages.

#### Scenario: Customer cannot see images during review
- **WHEN** customer views product detail page while product status is "reviewing"
- **THEN** generated images section shows message "等待审核完成"
- **AND** no generated images are displayed

#### Scenario: Customer can see approved images after review completion
- **WHEN** customer views product detail page while product status is "client_reviewing"
- **THEN** all approved generated images are displayed with "已通过" badge

#### Scenario: Customer can see images in completed status
- **WHEN** customer views product detail page while product status is "completed"
- **THEN** all approved generated images are displayed

### Requirement: Admin can reopen review
The system SHALL allow admin users to reopen a completed review and change status back to "reviewing" to continue image selection.

#### Scenario: Admin reopens review from client_reviewing
- **WHEN** admin changes product status from "client_reviewing" back to "reviewing"
- **THEN** product's `reviewedAt` field is cleared
- **AND** product's `reviewedBy` field is cleared
- **AND** customer can no longer view the generated images
