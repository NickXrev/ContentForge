-- Debug research tool issue
-- Check if client_profiles table exists and has data

-- 1. Check if client_profiles table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'client_profiles';

-- 2. Check client_profiles structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'client_profiles'
ORDER BY ordinal_position;

-- 3. Check if there are any client profiles
SELECT COUNT(*) as client_profile_count FROM public.client_profiles;

-- 4. Check teams table
SELECT COUNT(*) as team_count FROM public.teams;

-- 5. Check team_members table
SELECT COUNT(*) as team_member_count FROM public.team_members;
