CREATE TABLE "task_queue" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 10 NOT NULL,
	"payload" jsonb,
	"result" jsonb,
	"reference_id" varchar(50),
	"reference_type" varchar(50),
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"error_message" text,
	"failure_type" varchar(20),
	"locked_at" timestamp with time zone,
	"locked_by" varchar(100),
	"available_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "user_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "ai_generation_tasks" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "ai_generation_tasks" ALTER COLUMN "product_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "credit_transactions" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "credit_transactions" ALTER COLUMN "user_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "delivery_batches" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "delivery_batches" ALTER COLUMN "product_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "delivery_images" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "delivery_images" ALTER COLUMN "batch_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "delivery_images" ALTER COLUMN "image_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "image_feedbacks" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "image_feedbacks" ALTER COLUMN "product_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "image_feedbacks" ALTER COLUMN "image_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "operation_logs" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "operation_logs" ALTER COLUMN "user_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "product_generated_images" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "product_generated_images" ALTER COLUMN "product_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "product_source_images" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "product_source_images" ALTER COLUMN "product_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "product_style_selections" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "product_style_selections" ALTER COLUMN "product_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "user_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "user_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "user_profiles" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "user_profiles" ALTER COLUMN "user_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "ai_generation_tasks" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ai_generation_tasks" ADD COLUMN "result_count" integer;--> statement-breakpoint
ALTER TABLE "ai_generation_tasks" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ai_generation_tasks" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "delivery_batches" ADD COLUMN "batch_number" integer;--> statement-breakpoint
ALTER TABLE "delivery_batches" ADD COLUMN "image_count" integer;--> statement-breakpoint
ALTER TABLE "delivery_batches" ADD COLUMN "delivered_by" varchar(50);--> statement-breakpoint
ALTER TABLE "delivery_images" ADD COLUMN "sort_order" integer;--> statement-breakpoint
ALTER TABLE "product_generated_images" ADD COLUMN "generation_task_id" varchar(50);--> statement-breakpoint
ALTER TABLE "product_generated_images" ADD COLUMN "file_name" varchar(255);--> statement-breakpoint
ALTER TABLE "product_generated_images" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "product_generated_images" ADD COLUMN "batch_number" integer;--> statement-breakpoint
ALTER TABLE "product_generated_images" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_generated_images" ADD COLUMN "reviewed_by" varchar(50);--> statement-breakpoint
ALTER TABLE "product_source_images" ADD COLUMN "file_name" varchar(255);--> statement-breakpoint
ALTER TABLE "product_source_images" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "product_source_images" ADD COLUMN "mime_type" varchar(100);--> statement-breakpoint
ALTER TABLE "product_source_images" ADD COLUMN "batch_number" integer;--> statement-breakpoint
ALTER TABLE "product_source_images" ADD COLUMN "analysis" jsonb;--> statement-breakpoint
ALTER TABLE "product_source_images" ADD COLUMN "analyzed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "style_templates" ADD COLUMN "batch_number" integer;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "credits_total_spent" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "category" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_phone_unique" UNIQUE("phone");