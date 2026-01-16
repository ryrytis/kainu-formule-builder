-- Fix venipak_label_sequences schema
-- We need 'label_date' (text) and 'sequence_number' (int)
ALTER TABLE "venipak_label_sequences" 
ADD COLUMN IF NOT EXISTS "label_date" text,
ADD COLUMN IF NOT EXISTS "sequence_number" integer DEFAULT 0;

-- Fix venipak_global_sequence schema
-- We need 'current_sequence' (int)
ALTER TABLE "venipak_global_sequence" 
ADD COLUMN IF NOT EXISTS "current_sequence" integer DEFAULT 9502313;

-- Optional: Populate label_date if missing for existing rows (cleanup)
DELETE FROM "venipak_label_sequences" WHERE "label_date" IS NULL;

-- Optional: Ensure ID 1 exists for global
INSERT INTO "venipak_global_sequence" ("id", "current_sequence")
VALUES (1, 9502313)
ON CONFLICT ("id") DO UPDATE
SET "current_sequence" = 9502313
WHERE "venipak_global_sequence"."current_sequence" < 9502313;
