CREATE INDEX "task_queue_claim_idx" ON "task_queue" USING btree ("type","status","available_at","priority","created_at");--> statement-breakpoint
CREATE INDEX "task_queue_reference_idx" ON "task_queue" USING btree ("reference_id","reference_type");--> statement-breakpoint
CREATE INDEX "task_queue_recovery_idx" ON "task_queue" USING btree ("status","locked_at");