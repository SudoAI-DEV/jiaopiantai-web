ALTER TABLE "product_style_selections" RENAME TO "product_scene_selections";--> statement-breakpoint
ALTER TABLE "style_templates" RENAME TO "scene_templates";--> statement-breakpoint
ALTER TABLE "ai_generation_tasks" RENAME COLUMN "style_id" TO "scene_id";--> statement-breakpoint
ALTER TABLE "product_scene_selections" RENAME COLUMN "style_id" TO "scene_id";--> statement-breakpoint
ALTER TABLE "products" RENAME COLUMN "style_preference" TO "scene_preference";--> statement-breakpoint
ALTER TABLE "products" RENAME COLUMN "selected_style_id" TO "selected_scene_id";