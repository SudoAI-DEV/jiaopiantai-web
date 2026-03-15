CREATE TABLE "customer_models" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"image_url" text NOT NULL,
	"file_name" varchar(255),
	"file_size" integer,
	"mime_type" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "model_id" varchar(50);--> statement-breakpoint
CREATE INDEX "customer_models_user_active_created_idx" ON "customer_models" USING btree ("user_id","is_active","created_at");--> statement-breakpoint
CREATE INDEX "products_model_id_idx" ON "products" USING btree ("model_id");
