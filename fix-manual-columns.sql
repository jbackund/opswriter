-- Fix missing columns in manuals table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/mjpmvthvroflooywoyss/sql/new

ALTER TABLE public.manuals
ADD COLUMN IF NOT EXISTS cover_logo_url TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[];