-- Add missing columns to manuals table
ALTER TABLE public.manuals
ADD COLUMN IF NOT EXISTS cover_logo_url TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[];