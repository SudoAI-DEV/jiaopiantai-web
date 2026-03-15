ALTER TABLE "product_generated_images" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "reviewed_by" varchar(50);