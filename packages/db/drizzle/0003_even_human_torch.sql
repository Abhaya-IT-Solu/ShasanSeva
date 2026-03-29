ALTER TABLE "scheme_translations" ALTER COLUMN "locale" SET DATA TYPE varchar(5);--> statement-breakpoint
CREATE INDEX "idx_schemes_category" ON "schemes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_schemes_status" ON "schemes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_schemes_type" ON "schemes" USING btree ("scheme_type");--> statement-breakpoint
CREATE UNIQUE INDEX "scheme_translations_scheme_id_locale_key" ON "scheme_translations" USING btree ("scheme_id","locale");--> statement-breakpoint
CREATE INDEX "idx_scheme_translations_locale" ON "scheme_translations" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "idx_scheme_translations_scheme_id" ON "scheme_translations" USING btree ("scheme_id");--> statement-breakpoint
CREATE INDEX "idx_scheme_translations_scheme_locale" ON "scheme_translations" USING btree ("scheme_id","locale");--> statement-breakpoint
CREATE INDEX "idx_orders_user_id" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_orders_created_at" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_assigned_to" ON "orders" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_documents_order_id" ON "documents" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_documents_status" ON "documents" USING btree ("status");