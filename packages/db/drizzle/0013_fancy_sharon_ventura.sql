-- Every statement here is idempotent, on purpose.
--
-- Drizzle generated this migration against snapshot 0012, which does not know
-- about order_events, schemes.display_order, orders.user_notes/completed_at/
-- cancelled_at or uq_orders_payment_id — all of which are already live in
-- production, having been applied with `db:push` rather than a migration. The
-- generated file therefore tried to CREATE TABLE "order_events" a second time,
-- which aborts the whole transaction and takes the new enquiries table with it.
--
-- Written to run cleanly against both a drifted production database (skips what
-- is already there) and a fresh one (creates everything). Do not "tidy" the
-- IF NOT EXISTS guards away.

CREATE TABLE IF NOT EXISTS "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"event_type" varchar(40) NOT NULL,
	"from_status" varchar(30),
	"to_status" varchar(30),
	"actor_type" varchar(20) NOT NULL,
	"actor_id" uuid,
	"actor_name" varchar(255),
	"visibility" varchar(20) DEFAULT 'ADMIN_ONLY' NOT NULL,
	"message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone" varchar(15) NOT NULL,
	"email" varchar(255),
	"message" text NOT NULL,
	"scheme_id" uuid,
	"status" varchar(20) DEFAULT 'NEW' NOT NULL,
	"admin_note" text,
	"handled_by" uuid,
	"handled_at" timestamp,
	"source_ip" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schemes" ADD COLUMN IF NOT EXISTS "display_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "user_notes" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_scheme_id_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."schemes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_handled_by_admins_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_events_order_created" ON "order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_enquiries_status_created" ON "enquiries" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_enquiries_scheme_id" ON "enquiries" USING btree ("scheme_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_schemes_display_order" ON "schemes" USING btree ("display_order");--> statement-breakpoint
-- Unique, so it can fail on pre-existing duplicate payment_ids rather than
-- silently skipping. If it does, reconcile those orders before retrying.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_orders_payment_id" ON "orders" USING btree ("payment_id");
