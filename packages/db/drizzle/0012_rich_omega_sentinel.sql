ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_notifications_recipient_read" ON "notifications" USING btree ("recipient_id","recipient_type","read");--> statement-breakpoint
CREATE INDEX "idx_notifications_recipient_created" ON "notifications" USING btree ("recipient_id","recipient_type","created_at");