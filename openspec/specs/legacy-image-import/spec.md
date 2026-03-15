## Purpose

CLI script for importing legacy product images from local filesystem into the system database (PostgreSQL) and R2 cloud storage. Supports incremental batch uploads, customer model import, and YAML config parsing.

## Requirements

### Requirement: Directory structure parsing
The script SHALL auto-detect order batch directories under the base directory (skipping `models/`, `风格参考/`, `场景/`) and parse 3 levels of hierarchy:
1. **订单批次** (order batch): e.g. `2026_春夏_第一批`, `2026_春夏_第二批`, `产品 2`
2. **场景风格** (scene style): e.g. `室外街拍`, `都市松弛`, `海边艺术`, `田园自然`, `艺术建筑` (strip suffixes like `-已全部交付`)
3. **产品编号** (product number): e.g. `2-SJ-01`, `2-DS-05` (strip suffixes like `-通过`, `-需补拍`)

The script SHALL extract status annotations from directory names (e.g., `通过`, `需补拍`) and store them in `products.specialNotes`.

#### Scenario: Parse standard directory
- **WHEN** the script encounters path `2026_春夏_第一批/室外街拍/2-SJ-01`
- **THEN** it SHALL create a product with `productNumber=2-SJ-01`, `category=clothing`, `selectedStyleId=urban-street`, `name=第一批-室外街拍-2-SJ-01`

#### Scenario: Auto-detect batch directories
- **WHEN** the base directory contains `2026_春夏_第一批/`, `产品 2/`, `models/`, `风格参考/`
- **THEN** the script SHALL scan `2026_春夏_第一批/` and `产品 2/` as order batches, skipping `models/` and `风格参考/`

### Requirement: Scene name mapping
The script SHALL map Chinese scene directory names to code-driven scene IDs from `src/lib/scenes.ts`:
- `海边艺术` → `seaside-art`
- `自然田园` / `田园自然` → `country-garden`
- `都市街拍` / `都市松弛` / `室外街拍` → `urban-street`
- `艺术建筑` → `architectural-editorial`

The mapped scene ID SHALL be stored in `products.selectedStyleId`.

#### Scenario: Map scene name
- **WHEN** a product is under scene directory `田园自然`
- **THEN** it SHALL set `selectedStyleId=country-garden`

#### Scenario: Unmapped scene name
- **WHEN** a scene name has no mapping
- **THEN** the script SHALL set `selectedStyleId=null` and warn in dry-run output

### Requirement: YAML config parsing
The script SHALL read `配置.yaml` from each product directory to extract metadata: `model_image`, `scene`, `custom_requirements`.

#### Scenario: Extract shooting requirements
- **WHEN** `配置.yaml` contains `custom_requirements` entries
- **THEN** the script SHALL join them with newlines and store in `products.shootingRequirements`

#### Scenario: Resolve model reference
- **WHEN** `配置.yaml` contains `model_image: ../../../models/模特2号.png`
- **THEN** the script SHALL resolve the model file name `模特2号.png` and link the product to the corresponding `customerModels` record via `products.modelId`

### Requirement: Customer model import
The script SHALL scan the `models/` directory under the base path, upload model images to R2, and create `customerModels` records before importing products.

#### Scenario: Import model
- **WHEN** `models/模特1号.png` exists and is not yet in the database
- **THEN** the script SHALL upload to R2 at `models/{userId}/{modelId}/{fileName}` and insert a `customerModels` record

#### Scenario: Skip existing model
- **WHEN** a model with the same name already exists for the user
- **THEN** the script SHALL reuse the existing record ID

### Requirement: Source image import
The script SHALL upload source images (root-level image files in product directory, excluding `生成/` subdirectory) to R2 and insert `product_source_images` records.

#### Scenario: Upload source images
- **WHEN** a product directory contains image files at root level
- **THEN** the script SHALL upload to R2 at `source/{userId}/{productId}/{fileName}` and insert records

#### Scenario: Skip non-image files
- **WHEN** a product directory contains `.yaml`, `.json`, `.DS_Store`, or `Icon` files
- **THEN** the script SHALL skip these files

#### Scenario: Deduplicate source images
- **WHEN** the product already has source images in the database
- **THEN** the script SHALL skip source image upload for that product

### Requirement: Generated image import with batch deduplication
The script SHALL scan `生成/batch_XX/` subdirectories, upload images to R2, and insert `product_generated_images` records with the corresponding `batchNumber`. Already-imported batches SHALL be skipped.

#### Scenario: Import batch images
- **WHEN** a product has `生成/batch_01/` with 20 images
- **THEN** the script SHALL upload each image and insert records with `batchNumber=1`

#### Scenario: Skip existing batch
- **WHEN** `batch_01` images are already in the database for this product
- **THEN** the script SHALL skip `batch_01` and only upload new batches (e.g., `batch_02`)

#### Scenario: Incremental batch upload
- **WHEN** the script is re-run after `batch_03/` is added to an existing product
- **THEN** it SHALL upload only `batch_03` images without duplicating `batch_01` and `batch_02`

### Requirement: Product creation and update
The script SHALL create `products` records with status `reviewing`, `category=clothing`, and all available metadata. For existing products, it SHALL patch missing fields.

#### Scenario: Create new product
- **WHEN** importing a new product `2-TR-04`
- **THEN** it SHALL insert a record with `status=reviewing`, `category=clothing`, `selectedStyleId`, `modelId`, `batchNumber`, `shootingRequirements`

#### Scenario: Patch existing product
- **WHEN** a product already exists in the database with missing `selectedStyleId` or `modelId`
- **THEN** the script SHALL update those fields without recreating the product

### Requirement: Dry-run mode
The script SHALL support a `--dry-run` flag that prints operations without making changes, including model discovery, scene mapping status, and unmapped scene warnings.

#### Scenario: Dry-run output
- **WHEN** run with `--dry-run`
- **THEN** it SHALL show: customer models found, products grouped by batch/scene with scene ID mapping, per-product model and YAML status, and a summary

### Requirement: CLI interface
The script SHALL accept:
- `--user-id <id>` (required): Customer userId
- `--env <local|production>` (optional, default: `local`): Environment
- `--base-dir <path>` (optional, default: `客户/花姐&寅寅`): Base directory
- `--dry-run` (optional): Preview mode
- `--batch-filter <name>` (optional): Filter by order batch directory name
- `--product-filter <num1,num2,...>` (optional): Filter by comma-separated product numbers

#### Scenario: Filter by product
- **WHEN** run with `--product-filter 2-TR-04,2-TR-05,2-YJ-01`
- **THEN** the script SHALL only process those 3 products

### Requirement: Error handling and reporting
The script SHALL continue on individual failures and provide a completion summary including models created/skipped, products created/skipped/updated, images uploaded, and errors.

#### Scenario: Upload failure
- **WHEN** an R2 upload fails for a single image
- **THEN** the script SHALL log the error and continue

#### Scenario: Completion report
- **WHEN** the script finishes
- **THEN** it SHALL print: models created/skipped, products created/skipped/updated, source images uploaded, generated images uploaded, errors
