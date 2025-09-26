-- ContentForge Database Cleanup Script
-- Run this in your Supabase SQL editor to clean up existing tables

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS public.document_sessions CASCADE;
DROP TABLE IF EXISTS public.analytics CASCADE;
DROP TABLE IF EXISTS public.content_documents CASCADE;
DROP TABLE IF EXISTS public.client_profiles CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS content_platform CASCADE;
DROP TYPE IF EXISTS content_status CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Now run the main schema from supabase-schema.sql
-- (Copy and paste the contents of supabase-schema.sql here)
