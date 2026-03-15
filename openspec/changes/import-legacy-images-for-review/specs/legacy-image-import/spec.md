## ADDED Requirements

### Requirement: Directory structure parsing
The script SHALL scan `客户/花姐&寅寅/` and parse 3 levels of directory hierarchy:
1. **订单批次** (order batch): `2026_春夏_第一批`, `2026_春夏_第二批`, `产品 2`
2. **场景风格** (scene style): `室外街拍`, `都市松弛`, `海边艺术`, `田园自然`, `艺术建筑` (strip suffixes like `-已全部交付`)
3. **产品编号** (product number): `2-SJ-01`, `2-DS-05` etc. (strip suffixes like `-通过`, `-需补拍`)

The script SHALL extract status annotations from directory names (e.g., `通过`, `需补拍`, `需补充腋下细节`, `重拍剪裁细节`) and store them in `products.specialNotes`.

#### Scenario: Parse standard directory
- **WHEN** the script encounters path `2026_春夏_第一批/室外街拍/2-SJ-01`
- **THEN** it SHALL create a product with `productNumber=2-SJ-01`, `category=室外街拍`, `stylePreference=2026_春夏_第一批`, `name=第一批-室外街拍-2-SJ-01`

#### Scenario: Parse directory with status annotation
- **WHEN** the script encounters path `2026_春夏_第一批/室外街拍/2-SJ-13-通过`
- **THEN** it SHALL create a product with `productNumber=2-SJ-13`, `specialNotes=通过`

#### Scenario: Parse directory with stripped style suffix
- **WHEN** the script encounters path `2026_春夏_第一批/都市松弛-已全部交付/2-DS-05`
- **THEN** it SHALL set `category=都市松弛` (stripping `-已全部交付`)

### Requirement: Source image import
The script SHALL upload source images (files matching `微信图片_*.jpg` or other `.jpg` files in product root directory, excluding `生成/` subdirectory) to R2 and insert records into `product_source_images`.

#### Scenario: Upload source images
- **WHEN** a product directory contains `微信图片_20260309161201.jpg` at root level
- **THEN** the script SHALL upload it to R2 at path `source/{userId}/{productId}/{fileName}` and insert a `product_source_images` record with the R2 URL

#### Scenario: Skip non-image files
- **WHEN** a product directory contains `配置.yaml`, `.DS_Store`, or `Icon` files
- **THEN** the script SHALL skip these files

### Requirement: Generated image import with batch number
The script SHALL scan `生成/batch_XX/` subdirectories, upload each `scene_XX.png` to R2, and insert records into `product_generated_images` with the corresponding `batchNumber`.

#### Scenario: Import batch_01 images
- **WHEN** a product has `生成/batch_01/scene_01.png` through `scene_10.png`
- **THEN** the script SHALL upload each image and insert `product_generated_images` records with `batchNumber=1`

#### Scenario: Import multiple batches
- **WHEN** a product has `生成/batch_01/`, `生成/batch_02/`, and `生成/batch_03/`
- **THEN** the script SHALL import all batches with `batchNumber` set to 1, 2, 3 respectively

#### Scenario: Preserve filename annotations
- **WHEN** a generated image is named `scene_02-裤子后侧口袋少了.png`
- **THEN** the script SHALL store the original fileName including the annotation

### Requirement: Product creation
The script SHALL create a `products` record for each product directory with status `reviewing` and `reviewStatus=pending` for all generated images.

#### Scenario: Create product record
- **WHEN** importing product `2-SJ-01` for userId `abc123`
- **THEN** the script SHALL insert a `products` record with `userId=abc123`, `status=reviewing`, `productNumber=2-SJ-01`

#### Scenario: Skip existing product
- **WHEN** a product with the same `productNumber` already exists for the given `userId`
- **THEN** the script SHALL skip that product and log a message

### Requirement: Dry-run mode
The script SHALL support a `--dry-run` flag that prints the operations it would perform without making any changes.

#### Scenario: Dry-run output
- **WHEN** the script is run with `--dry-run`
- **THEN** it SHALL print a summary of products to create, source images to upload, and generated images to upload, grouped by order batch and scene style

### Requirement: CLI interface
The script SHALL accept the following arguments:
- `--user-id <id>` (required): The customer's userId in the system
- `--base-dir <path>` (optional, default: `客户/花姐&寅寅`): Base directory to scan
- `--dry-run` (optional): Preview mode
- `--batch-filter <name>` (optional): Only import a specific order batch (e.g., `2026_春夏_第一批`)

#### Scenario: Run with required arguments
- **WHEN** the user runs `npx tsx scripts/import-legacy-images.ts --user-id abc123`
- **THEN** the script SHALL import all products from the default base directory

#### Scenario: Filter by batch
- **WHEN** the user runs with `--batch-filter 2026_春夏_第二批`
- **THEN** the script SHALL only process products under `2026_春夏_第二批/`

### Requirement: Error handling and reporting
The script SHALL continue processing on individual image upload failures and provide a summary report at completion.

#### Scenario: Upload failure
- **WHEN** an R2 upload fails for a single image
- **THEN** the script SHALL log the error, skip that image, and continue with remaining images

#### Scenario: Completion report
- **WHEN** the script finishes
- **THEN** it SHALL print a summary: total products created, source images uploaded, generated images uploaded, errors encountered
