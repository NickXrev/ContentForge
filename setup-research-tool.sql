-- Quick setup for Research Tool
-- Run this in your Supabase SQL editor

-- Create the research tool tables
\i research-tool-schema.sql

-- Insert some sample data for testing (optional)
INSERT INTO public.company_research (team_id, company_name, website_url, research_status) 
SELECT 
  t.id as team_id,
  'Sample Company' as company_name,
  'https://example.com' as website_url,
  'completed' as research_status
FROM public.teams t
LIMIT 1;

-- Show success message
SELECT 'Research tool setup completed! You can now use the research tool.' as status;
