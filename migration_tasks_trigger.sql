-- Create the function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sample Data (Robust version: Works in migration/service_role context)
-- Assigns tasks to the first user found in the database
INSERT INTO tasks (description, status, created_by, assigned_to, order_id)
SELECT 
    'Review pending orders', 
    'pending', 
    id as created_by,
    id as assigned_to,
    (SELECT id FROM orders LIMIT 1)
FROM users 
LIMIT 1;

INSERT INTO tasks (description, status, created_by, assigned_to)
SELECT 
    'Update client contact info', 
    'in_progress', 
    id as created_by,
    id as assigned_to
FROM users 
LIMIT 1;
