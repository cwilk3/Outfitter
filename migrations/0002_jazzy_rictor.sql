ALTER TABLE "booking_guides" ALTER COLUMN "guide_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "guide_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "experience_guides" ALTER COLUMN "guide_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "user_outfitters" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" varchar NOT NULL;