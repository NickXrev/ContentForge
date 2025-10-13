-- Test script to verify the signup fix is working
-- Run this after applying the complete-signup-fix.sql

-- 1. Check if the trigger exists and is properly configured
SELECT 
  trigger_name, 
  event_manipulation, 
  action_timing, 
  action_statement,
  trigger_schema
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 2. Verify the function exists and has SECURITY DEFINER
SELECT 
  routine_name, 
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- 3. Check RLS status and policies
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users';

-- 4. List all policies on the users table
SELECT 
  policyname, 
  cmd as command, 
  permissive,
  qual as using_clause, 
  with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 5. Check if the users table has the correct structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Test the function directly (this should work without errors)
-- Note: This will only work if you have a test user in auth.users
-- SELECT public.handle_new_user();

-- 7. Check for any existing users in the public.users table
SELECT 
  id, 
  email, 
  full_name, 
  role, 
  created_at
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;


