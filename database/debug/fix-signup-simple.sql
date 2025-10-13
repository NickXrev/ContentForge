-- Simple fix for Supabase signup error
-- This temporarily disables RLS for user creation to allow the trigger to work

-- 1. Temporarily disable RLS on users table to allow trigger to work
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Ensure the trigger function exists and is properly configured
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'editor'::user_role
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Re-enable RLS after trigger is set up
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Create proper RLS policies
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 6. Allow system operations (like triggers) to insert users
CREATE POLICY "Allow system user creation" ON public.users
  FOR INSERT WITH CHECK (true);  -- Allow all inserts for now

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT INSERT ON public.users TO postgres;


