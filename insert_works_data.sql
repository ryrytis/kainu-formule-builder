-- Insert default work operations if they don't already exist
INSERT INTO "public"."works" ("operation", "duration", "price")
SELECT 'Pjovimas', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM "public"."works" WHERE "operation" = 'Pjovimas');

INSERT INTO "public"."works" ("operation", "duration", "price")
SELECT 'Spauda', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM "public"."works" WHERE "operation" = 'Spauda');

INSERT INTO "public"."works" ("operation", "duration", "price")
SELECT 'Laminavimas', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM "public"."works" WHERE "operation" = 'Laminavimas');

INSERT INTO "public"."works" ("operation", "duration", "price")
SELECT 'Invoiced', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM "public"."works" WHERE "operation" = 'Invoiced');
