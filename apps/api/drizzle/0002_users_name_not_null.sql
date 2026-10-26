UPDATE "users" SET "name" = COALESCE(NULLIF(split_part("email", '@', 1), ''), "email") WHERE "name" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;
