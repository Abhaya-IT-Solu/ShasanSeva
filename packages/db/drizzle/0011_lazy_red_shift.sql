ALTER TABLE "users" ADD COLUMN "profile_data" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "schemes" ADD COLUMN "custom_fields" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "application_form_data" jsonb DEFAULT '{}'::jsonb;