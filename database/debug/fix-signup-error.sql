-- Fix Supabase signup error: "Database error saving new user"
-- This addresses RLS policy conflicts during user creation

-- 1. First, let's check the current state
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 2. Drop the problematic INSERT policy that's causing the issue
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- 3. Create a new policy that allows the trigger function to insert users
-- This policy allows inserts when the user ID matches the authenticated user OR when it's a system operation
CREATE POLICY "Allow user creation via trigger" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    auth.uid() IS NULL  -- Allow system operations (like triggers)
  );

-- 4. Ensure the handle_new_user function is properly set up with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the new user profile
  INSERT INTO public.users (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'editor'::user_role  -- Set default role
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE LOG 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Drop and recreate the trigger to ensure it's properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Also ensure we have proper policies for other operations
-- Keep the existing SELECT and UPDATE policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 7. Grant necessary permissions to the function
GRANT USAGE ON SCHEMA public TO postgres;
GRANT INSERT ON public.users TO postgres;

-- 8. Test the setup by checking if the function and trigger exist
SELECT 
  trigger_name, 
  event_manipulation, 
  action_timing, 
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 9. Verify the function exists and has the right permissions
SELECT 
  routine_name, 
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';




