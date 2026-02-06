-- Reset table to ensure clean state
DROP TABLE IF EXISTS ai_knowledge CASCADE;
-- Create the ai_knowledge table
CREATE TABLE ai_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable Row Level Security (RLS)
ALTER TABLE ai_knowledge ENABLE ROW LEVEL SECURITY;
-- Create policies (Open for read/write for authenticated users for now)
CREATE POLICY "Allow authenticated users to read ai_knowledge" ON ai_knowledge FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert ai_knowledge" ON ai_knowledge FOR
INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update ai_knowledge" ON ai_knowledge FOR
UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete ai_knowledge" ON ai_knowledge FOR DELETE TO authenticated USING (true);
-- Seed data from 'products'
INSERT INTO ai_knowledge (topic, content, category, priority)
SELECT name,
    'We offer ' || name || '. ' || COALESCE(description, '') || (
        CASE
            WHEN base_price IS NOT NULL THEN ' Base price starts at ' || base_price || ' EUR.'
            ELSE ' Price on request.'
        END
    ),
    'Products',
    5
FROM products;
-- Seed data from 'works' (Services)
-- REMOVED 'unit' column usage as it does not exist in production DB
INSERT INTO ai_knowledge (topic, content, category, priority)
SELECT operation,
    'Service available: ' || operation || '. Price is ' || price || ' EUR.',
    'Services',
    5
FROM works;
-- Seed data from 'materials'
INSERT INTO ai_knowledge (topic, content, category, priority)
SELECT name,
    'Material available: ' || name || '. ' || COALESCE(description, '') || (
        CASE
            WHEN unit_price IS NOT NULL THEN ' Cost: ' || unit_price || ' EUR per ' || COALESCE(unit, 'unit') || '.'
            ELSE ''
        END
    ),
    'Materials',
    3
FROM materials;
-- Add System defaults
INSERT INTO ai_knowledge (topic, content, category, priority)
VALUES (
        'System Tone',
        'You are a helpful, professional assistant for "Keturi print" (Four Prints). You help clients with printing orders, quotes, and status updates. Be concise and polite.',
        'System',
        10
    ),
    (
        'Business Hours',
        'We are open Monday to Friday, 9:00 AM to 6:00 PM. Closed on weekends and public holidays.',
        'General',
        8
    ),
    (
        'Contact Info',
        'You can reach us at info@keturiprint.lt or by phone.',
        'General',
        8
    );