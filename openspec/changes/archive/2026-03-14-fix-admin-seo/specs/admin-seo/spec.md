## ADDED Requirements

### Requirement: Admin pages SHALL NOT be indexed by search engines

All pages under `/admin/*` SHALL have `robots` metadata set to `{ index: false, follow: false }` to prevent search engine indexing of sensitive admin content.

#### Scenario: Admin layout sets noindex robots
- **WHEN** any admin page is rendered
- **THEN** the HTML `<meta name="robots">` tag SHALL contain `noindex, nofollow`

#### Scenario: Robots noindex applies to all nested admin pages
- **WHEN** a user visits `/admin`, `/admin/products`, `/admin/customers`, `/admin/credits`, `/admin/styles`, `/admin/customers/[id]`, or `/admin/products/[id]/review`
- **THEN** each page SHALL have `noindex, nofollow` in the robots meta tag

### Requirement: Each admin page SHALL have a unique page title

Every admin page SHALL export metadata with a descriptive `title` that leverages the root layout's title template (`%s | 蕉片台`).

#### Scenario: Admin dashboard title
- **WHEN** user visits `/admin`
- **THEN** the page title SHALL be "管理后台 | 蕉片台"

#### Scenario: Products page title
- **WHEN** user visits `/admin/products`
- **THEN** the page title SHALL be "产品管理 | 蕉片台"

#### Scenario: Customers page title
- **WHEN** user visits `/admin/customers`
- **THEN** the page title SHALL be "客户管理 | 蕉片台"

#### Scenario: Credits page title
- **WHEN** user visits `/admin/credits`
- **THEN** the page title SHALL be "点数管理 | 蕉片台"

#### Scenario: Styles page title
- **WHEN** user visits `/admin/styles`
- **THEN** the page title SHALL be "风格模板管理 | 蕉片台"

### Requirement: Dynamic admin pages SHALL generate metadata with entity names

Dynamic admin pages (`/admin/customers/[id]` and `/admin/products/[id]/review`) SHALL use `generateMetadata` to include the entity name in the page title.

#### Scenario: Customer detail page title
- **WHEN** user visits `/admin/customers/[id]` for a customer with shopName "小红服装店"
- **THEN** the page title SHALL be "小红服装店 - 客户详情 | 蕉片台"

#### Scenario: Customer detail page title fallback
- **WHEN** user visits `/admin/customers/[id]` for a customer without shopName
- **THEN** the page title SHALL be "客户详情 | 蕉片台"

#### Scenario: Product review page title
- **WHEN** user visits `/admin/products/[id]/review` for a product named "春季连衣裙"
- **THEN** the page title SHALL be "春季连衣裙 - 产品审核 | 蕉片台"

#### Scenario: Product review page title for non-existent product
- **WHEN** user visits `/admin/products/[id]/review` for a non-existent product
- **THEN** the page title SHALL be "产品审核 | 蕉片台"

### Requirement: Admin metadata SHALL be server-side rendered

All admin page metadata (static and dynamic) SHALL be generated server-side as part of SSR, ensuring correct `<head>` tags are present in the initial HTML response.

#### Scenario: SSR metadata in HTML response
- **WHEN** a crawler or browser requests any admin page
- **THEN** the initial HTML response SHALL contain the correct `<title>` and `<meta name="robots">` tags without requiring client-side JavaScript
