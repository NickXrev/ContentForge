-- Add a test social account to see the accounts page in action
-- Run this in your Supabase SQL Editor

-- First, make sure we have a team (if not, create one)
INSERT INTO public.teams (id, name, description, created_by)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Test Team',
  'Test team for development',
  (SELECT id FROM public.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Add user to team if not already added
INSERT INTO public.team_members (team_id, user_id, role, permissions)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM public.users LIMIT 1),
  'admin',
  '{"all": true}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_members 
  WHERE team_id = '00000000-0000-0000-0000-000000000001'::uuid 
  AND user_id = (SELECT id FROM public.users LIMIT 1)
);

-- Add a test LinkedIn account
INSERT INTO public.social_accounts (
  team_id,
  user_id,
  platform,
  account_id,
  account_name,
  username,
  access_token,
  is_active,
  is_verified,
  follower_count,
  metadata
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM public.users LIMIT 1),
  'linkedin',
  'test_linkedin_123',
  'Test LinkedIn Account',
  'testlinkedin',
  'test_access_token_123',
  true,
  true,
  1250,
  '{"personUrn": "urn:li:person:test123"}'::jsonb
);

-- Add a test Twitter account
INSERT INTO public.social_accounts (
  team_id,
  user_id,
  platform,
  account_id,
  account_name,
  username,
  access_token,
  is_active,
  is_verified,
  follower_count,
  metadata
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM public.users LIMIT 1),
  'twitter',
  'test_twitter_456',
  'Test Twitter Account',
  'testtwitter',
  'test_access_token_456',
  true,
  false,
  890,
  '{"apiKey": "test_key", "apiSecret": "test_secret"}'::jsonb
);

-- Add an inactive Instagram account
INSERT INTO public.social_accounts (
  team_id,
  user_id,
  platform,
  account_id,
  account_name,
  username,
  access_token,
  is_active,
  is_verified,
  follower_count,
  metadata
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM public.users LIMIT 1),
  'instagram',
  'test_instagram_789',
  'Test Instagram Account',
  'testinstagram',
  'test_access_token_789',
  false,
  true,
  2100,
  '{"userId": "test_ig_user_123"}'::jsonb
);
