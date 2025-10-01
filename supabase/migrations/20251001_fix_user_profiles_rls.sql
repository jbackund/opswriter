-- Fix RLS policy for user_profiles to allow signup
-- The current policy only allows SysAdmins to insert, but new users need to create their own profile

-- Drop the restrictive policy
DROP POLICY IF EXISTS "SysAdmins can insert profiles" ON user_profiles;

-- Create a combined policy that allows:
-- 1. Users to insert their own profile during signup (id = auth.uid())
-- 2. SysAdmins to insert any profile
CREATE POLICY "Users can insert own profile or SysAdmins can insert any" ON user_profiles
FOR INSERT
WITH CHECK (
  auth.uid() = id  -- User creating their own profile
  OR
  EXISTS (         -- Or user is a SysAdmin
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'sysadmin'
  )
);

-- Also fix the existing user who signed up but couldn't create profile
INSERT INTO user_profiles (id, email, full_name, role, is_active)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  'manager',
  true
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.users.id
);