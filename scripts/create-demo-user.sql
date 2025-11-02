-- Create Demo User for ContentForge
-- Run this in Supabase SQL Editor AFTER creating the auth user
-- 
-- Step 1: Create auth user via Supabase Dashboard:
--   1. Go to Authentication > Users > Add user
--   2. Email: demo@contentforge.com
--   3. Password: Demo0!
--   4. Auto Confirm User: ✅
--   5. Click Create
--
-- Step 2: Run this SQL script (it will find the user and set up everything)

DO $$
DECLARE
  demo_user_id UUID;
  demo_team_id UUID;
BEGIN
  -- Find the demo user in auth.users
  SELECT id INTO demo_user_id
  FROM auth.users
  WHERE email = 'demo@contentforge.com'
  LIMIT 1;

  IF demo_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email demo@contentforge.com not found. Please create the auth user first via Dashboard: Authentication > Users > Add user';
  END IF;

  RAISE NOTICE 'Found user: %', demo_user_id;

  -- Create/upsert user profile in public.users
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (demo_user_id, 'demo@contentforge.com', 'Demo User', 'editor')
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;

  RAISE NOTICE 'User profile created/updated';

  -- Check if user already has a team membership
  SELECT team_id INTO demo_team_id
  FROM public.team_members
  WHERE user_id = demo_user_id
  LIMIT 1;

  -- If no team membership, create team and membership
  IF demo_team_id IS NULL THEN
    -- Check if user owns a team
    SELECT id INTO demo_team_id
    FROM public.teams
    WHERE owner_id = demo_user_id
    LIMIT 1;

    -- If no owned team, create one
    IF demo_team_id IS NULL THEN
      INSERT INTO public.teams (name, description, owner_id)
      VALUES ('Demo User''s Team', 'Auto-created team for Demo User', demo_user_id)
      RETURNING id INTO demo_team_id;

      RAISE NOTICE 'Team created: %', demo_team_id;
    ELSE
      RAISE NOTICE 'Found existing team: %', demo_team_id;
    END IF;

    -- Create team membership
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (demo_team_id, demo_user_id, 'admin')
    ON CONFLICT (team_id, user_id) DO UPDATE
    SET role = 'admin';

    RAISE NOTICE 'Team membership created';
  ELSE
    RAISE NOTICE 'User already has team membership: %', demo_team_id;
  END IF;

  RAISE NOTICE '✅ Demo user setup complete!';
  RAISE NOTICE 'Email: demo@contentforge.com';
  RAISE NOTICE 'Password: Demo0!';
  RAISE NOTICE 'User ID: %', demo_user_id;
  RAISE NOTICE 'Team ID: %', demo_team_id;

END $$;

-- Verify the setup
SELECT 
  u.email,
  u.full_name,
  t.name as team_name,
  tm.role as team_role
FROM public.users u
LEFT JOIN public.team_members tm ON tm.user_id = u.id
LEFT JOIN public.teams t ON t.id = tm.team_id
WHERE u.email = 'demo@contentforge.com';

