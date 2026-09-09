-- IF NOT EXISTS because schema changes on this project reach the database via
-- `db:push`, which does not record migrations. Without the guard, replaying this
-- file against a database that has already been pushed to fails.
ALTER TABLE "schemes" ADD COLUMN IF NOT EXISTS "source_url" text;
