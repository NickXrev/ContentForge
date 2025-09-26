-- Test inserting into company_research table
-- Use the exact team_id from your team_members table

INSERT INTO public.company_research (
  team_id, 
  company_name, 
  website_url, 
  research_status
) VALUES (
  'b0ae77eb-2d57-4007-867c-157d05ffc61c',  -- Your actual team_id
  'Test Company',
  'https://example.com',
  'pending'
) RETURNING *;
