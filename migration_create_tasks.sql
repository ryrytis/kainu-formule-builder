CREATE TABLE "tasks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "description" text NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "assigned_to" uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "order_id" uuid REFERENCES "orders"("id") ON DELETE SET NULL,
    "due_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add index for faster lookups
CREATE INDEX "tasks_assigned_to_idx" ON "tasks" ("assigned_to");
CREATE INDEX "tasks_created_by_idx" ON "tasks" ("created_by");
CREATE INDEX "tasks_order_id_idx" ON "tasks" ("order_id");

-- Enable RLS
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own tasks (created by or assigned to them)
CREATE POLICY "Users can view their own tasks" ON "tasks"
    FOR SELECT
    USING (
        auth.uid() = created_by OR 
        auth.uid() = assigned_to OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow users to create tasks
CREATE POLICY "Users can create tasks" ON "tasks"
    FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
    );

-- Allow users to update tasks assigned to them or created by them
CREATE POLICY "Users can update their tasks" ON "tasks"
    FOR UPDATE
    USING (
        auth.uid() = created_by OR 
        auth.uid() = assigned_to OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow users to delete tasks created by them
CREATE POLICY "Users can delete their created tasks" ON "tasks"
    FOR DELETE
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );
