-- Migration: set default user role to manager (normal user)
ALTER TABLE user_profiles
  ALTER COLUMN role SET DEFAULT 'manager';
