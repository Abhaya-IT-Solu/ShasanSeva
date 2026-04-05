ALTER TABLE "announcements" ADD COLUMN "description" varchar(500);--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "image_key" varchar(500);--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "scheme_id" uuid;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_scheme_id_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."schemes"("id") ON DELETE no action ON UPDATE no action;
