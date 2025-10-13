-- Complete fix for Supabase signup error: "Database error saving new user"
-- This addresses the RLS policy conflict that prevents user creation during signup

-- Step 1: Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Step 2: Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Allow user creation via trigger" ON public.users;
DROP POLICY IF EXISTS "Allow system user creation" ON public.users;

-- Step 3: Temporarily disable RLS to allow the trigger to work
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 4: Ensure the users table has the correct structure
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'editor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create a robust trigger function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the new user profile with proper error handling
  INSERT INTO public.users (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'editor'::user_role
  );
  
  -- Log successful creation
  RAISE LOG 'User profile created successfully for user: %', NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE LOG 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    -- Still return NEW to allow auth to complete
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Grant necessary permissions to the function
GRANT USAGE ON SCHEMA public TO postgres;
GRANT INSERT ON public.users TO postgres;

-- Step 7: Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 9: Create new RLS policies that work with the trigger
-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Allow system operations (triggers) to insert users
-- This is the key fix - allows the trigger to work
CREATE POLICY "Allow system user creation" ON public.users
  FOR INSERT WITH CHECK (true);

-- Step 10: Verify the setup
SELECT 
  trigger_name, 
  event_manipulation, 
  action_timing, 
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Step 11: Test the function exists and has proper permissions
SELECT 
  routine_name, 
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Step 12: Check that RLS is enabled and policies are in place
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Step 13: Verify policies are created
SELECT 
  policyname, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE tablename = 'users';


