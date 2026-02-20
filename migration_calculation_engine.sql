-- Calculation Engine Schema Updates
-- Add extra_name column for labeling extras (e.g., "Matt Lamination", "Foil", "Rounded Corners")
ALTER TABLE calculation_rules
ADD COLUMN IF NOT EXISTS extra_name text;
-- Add updated_at column if missing
ALTER TABLE calculation_rules
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ language 'plpgsql';
-- Apply trigger to calculation_rules
DROP TRIGGER IF EXISTS update_calculation_rules_updated_at ON calculation_rules;
CREATE TRIGGER update_calculation_rules_updated_at BEFORE
UPDATE ON calculation_rules FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();