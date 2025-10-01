-- Fix missing content column in chapters table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/mjpmvthvroflooywoyss/sql/new

ALTER TABLE chapters ADD COLUMN IF NOT EXISTS content TEXT;

-- Add helpful comment
COMMENT ON COLUMN chapters.content IS 'Chapter content storage. Note: The proper architecture uses content_blocks table for rich content.';