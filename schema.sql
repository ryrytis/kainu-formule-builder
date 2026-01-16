CREATE SCHEMA "public";
CREATE TYPE "app_role" AS ENUM('admin', 'user');
CREATE TABLE "calc_quantity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"quantity" integer NOT NULL,
	"multiplicator" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "calculation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"rule_type" text NOT NULL,
	"criteria" jsonb NOT NULL,
	"value" numeric NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"discount_koef" integer,
	"City" text,
	"person_type" text,
	"delivery_method" text,
	"address" text,
	"company_code" text,
	"vat_payer" boolean,
	"vat_code" text,
	"city" text,
	"post_code" text,
	"parcel_locker" text,
	"form_link_status" text
);
CREATE TABLE "material_usage_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"material_id" uuid NOT NULL,
	"order_id" uuid,
	"order_item_id" uuid,
	"quantity_used" numeric(10, 2) NOT NULL,
	"transaction_type" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL CONSTRAINT "materials_name_unique" UNIQUE,
	"description" text,
	"unit_price" numeric(10, 3),
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_stock" numeric(10, 2) DEFAULT '0',
	"unit" text DEFAULT 'A3 sheets'
);
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"order_id" uuid NOT NULL,
	"material_id" uuid,
	"product_type" text NOT NULL,
	"format" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"height" text,
	"width" text,
	"pages" integer,
	"print_type" text,
	"paper_type" text,
	"coating" text,
	"binding" text,
	"unit_price" numeric(10, 3),
	"total_price" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lamination" text,
	"depth" text,
	"specifications" jsonb
);
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"client_id" uuid NOT NULL,
	"order_number" text NOT NULL CONSTRAINT "orders_order_number_unique" UNIQUE,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_price" numeric(10, 2) DEFAULT '0',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invoiced" boolean DEFAULT false NOT NULL,
	"shipped" boolean DEFAULT false NOT NULL,
	"shipment_number" text,
	"pack_number" text,
	"email_id" text,
	"email_subject" text,
	"finish_date" timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
	"workflow_link" text
);
CREATE TABLE "print_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"print_option" text NOT NULL,
	"price" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"print_option_name" text
);
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"category" text NOT NULL,
	"file_name" text NOT NULL,
	"object_path" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "product_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"product_id" uuid NOT NULL UNIQUE,
	"material_id" uuid NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_materials_product_id_material_id_key" UNIQUE("product_id","material_id")
);
CREATE TABLE "product_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"image_id" uuid,
	"category" text NOT NULL,
	"file_name" text NOT NULL,
	"object_path" text NOT NULL,
	"prompt" text NOT NULL,
	"duration" integer DEFAULT 10 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sora_job_id" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL CONSTRAINT "products_name_key" UNIQUE,
	"category" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"base_price" numeric(10, 2),
	"restricted_to_users" text[]
);
CREATE TABLE "SASKAITA123Data" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "SASKAITA123Data_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"productId" text,
	"bankId" text,
	"vatId" text DEFAULT nextval('"SASKAITA123Data_vatId_seq"'::regclass) NOT NULL,
	"seriesId" text,
	"unitId" text
);
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"role" app_role NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" text NOT NULL CONSTRAINT "users_email_key" UNIQUE,
	"password" text NOT NULL,
	"role" app_role DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "VenipackPickupPoints" (
	"id" integer PRIMARY KEY,
	"pastomatId" text,
	"pastomat_name" text NOT NULL,
	"pastomat_city" text NOT NULL,
	"pastomat_address" text NOT NULL,
	"pastomat_zip" text,
	"name" text
);
CREATE TABLE "venipak_global_sequence" (
	"id" integer PRIMARY KEY DEFAULT 1,
	"current_sequence" integer DEFAULT 9502229 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "venipak_label_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"label_date" text NOT NULL,
	"sequence_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "works" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"operation" text NOT NULL,
	"duration" numeric NOT NULL,
	"price" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "material_usage_transactions" ADD CONSTRAINT "material_usage_transactions_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE;
ALTER TABLE "material_usage_transactions" ADD CONSTRAINT "material_usage_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;
ALTER TABLE "material_usage_transactions" ADD CONSTRAINT "material_usage_transactions_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "materials"("id");
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
ALTER TABLE "product_materials" ADD CONSTRAINT "product_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE;
ALTER TABLE "product_materials" ADD CONSTRAINT "product_materials_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;
ALTER TABLE "product_videos" ADD CONSTRAINT "product_videos_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "product_images"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX "calc_quantity_pkey" ON "calc_quantity" ("id");
CREATE UNIQUE INDEX "calculation_rules_pkey" ON "calculation_rules" ("id");
CREATE UNIQUE INDEX "clients_pkey" ON "clients" ("id");
CREATE UNIQUE INDEX "material_usage_transactions_pkey" ON "material_usage_transactions" ("id");
CREATE UNIQUE INDEX "materials_name_unique" ON "materials" ("name");
CREATE UNIQUE INDEX "materials_pkey" ON "materials" ("id");
CREATE UNIQUE INDEX "order_items_pkey" ON "order_items" ("id");
CREATE UNIQUE INDEX "orders_order_number_unique" ON "orders" ("order_number");
CREATE UNIQUE INDEX "orders_pkey" ON "orders" ("id");
CREATE UNIQUE INDEX "print_options_pkey" ON "print_options" ("id");
CREATE UNIQUE INDEX "product_images_pkey" ON "product_images" ("id");
CREATE UNIQUE INDEX "product_materials_pkey" ON "product_materials" ("id");
CREATE UNIQUE INDEX "product_materials_product_id_material_id_key" ON "product_materials" ("product_id","material_id");
CREATE UNIQUE INDEX "product_videos_pkey" ON "product_videos" ("id");
CREATE UNIQUE INDEX "products_name_key" ON "products" ("name");
CREATE UNIQUE INDEX "products_pkey" ON "products" ("id");
CREATE UNIQUE INDEX "SASKAITA123Data_pkey" ON "SASKAITA123Data" ("id");
CREATE UNIQUE INDEX "user_roles_pkey" ON "user_roles" ("id");
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");
CREATE UNIQUE INDEX "users_pkey" ON "users" ("id");
CREATE UNIQUE INDEX "VenipackPickupPoints_pkey" ON "VenipackPickupPoints" ("id");
CREATE UNIQUE INDEX "venipak_global_sequence_pkey" ON "venipak_global_sequence" ("id");
CREATE UNIQUE INDEX "venipak_label_sequences_pkey" ON "venipak_label_sequences" ("id");
CREATE UNIQUE INDEX "works_pkey" ON "works" ("id");
