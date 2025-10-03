-- Migration: 20251003100000_create_organization_settings.sql
-- Purpose: Create organization settings and reference categories tables for managing global config

-- Create organization_settings table
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#3B82F6',
  secondary_color TEXT NOT NULL DEFAULT '#10B981',
  footer_text TEXT,
  default_review_days INTEGER NOT NULL DEFAULT 7 CHECK (default_review_days > 0),
  auto_increment_revision BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reference_categories table
CREATE TABLE IF NOT EXISTS reference_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_settings
-- Everyone can read organization settings
CREATE POLICY "Anyone can view organization settings"
  ON organization_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only SysAdmins can update organization settings
CREATE POLICY "Only SysAdmins can update organization settings"
  ON organization_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'sysadmin'
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'sysadmin'
      AND user_profiles.is_active = true
    )
  );

-- Only SysAdmins can insert organization settings
CREATE POLICY "Only SysAdmins can insert organization settings"
  ON organization_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'sysadmin'
      AND user_profiles.is_active = true
    )
  );

-- RLS Policies for reference_categories
-- Everyone can read reference categories
CREATE POLICY "Anyone can view reference categories"
  ON reference_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Only SysAdmins can insert reference categories
CREATE POLICY "Only SysAdmins can insert reference categories"
  ON reference_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'sysadmin'
      AND user_profiles.is_active = true
    )
  );

-- Only SysAdmins can update reference categories
CREATE POLICY "Only SysAdmins can update reference categories"
  ON reference_categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'sysadmin'
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'sysadmin'
      AND user_profiles.is_active = true
    )
  );

-- Only SysAdmins can delete reference categories
CREATE POLICY "Only SysAdmins can delete reference categories"
  ON reference_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'sysadmin'
      AND user_profiles.is_active = true
    )
  );

-- Create trigger to update updated_at timestamp on organization_settings
CREATE OR REPLACE FUNCTION update_organization_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organization_settings_updated_at_trigger
  BEFORE UPDATE ON organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_settings_updated_at();

-- Insert default organization settings if none exist
INSERT INTO organization_settings (organization_name, footer_text)
SELECT
  'Your Organization',
  'This is a controlled document. Unauthorized distribution is prohibited.'
WHERE NOT EXISTS (SELECT 1 FROM organization_settings);

-- Insert default reference categories
INSERT INTO reference_categories (name, description, display_order) VALUES
  ('General', 'General purpose definitions and abbreviations', 1),
  ('Technical', 'Technical terms and specifications', 2),
  ('Medical', 'Medical terminology and procedures', 3),
  ('Legal', 'Legal and regulatory terms', 4)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reference_categories_active
  ON reference_categories (is_active, display_order)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_reference_categories_display_order
  ON reference_categories (display_order);

-- Add helpful comments
COMMENT ON TABLE organization_settings IS 'Global organization settings and branding configuration';
COMMENT ON TABLE reference_categories IS 'Categories for organizing definitions and abbreviations';
COMMENT ON COLUMN organization_settings.default_review_days IS 'Default number of days for review period when sending manuals for review';
COMMENT ON COLUMN organization_settings.auto_increment_revision IS 'Whether to automatically increment revision number upon approval';
COMMENT ON COLUMN reference_categories.display_order IS 'Order in which categories should be displayed in the UI';