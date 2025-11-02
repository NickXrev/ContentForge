-- Add a specific user to a team (creates team if missing)
-- Usage: Open in Supabase SQL Editor, change the email/team name below, then run.

-- CONFIG: set these to your test user's email and desired team name
WITH cfg AS (
  SELECT 
    'test@contentforge.com'::text AS user_email,
    'Test Team'::text AS team_name,
    'Test team for development'::text AS team_description
)

-- Ensure the user exists in public.users and capture IDs
, u AS (
  SELECT 
    au.id            AS auth_user_id,
    pu.id            AS public_user_id,
    au.email
  FROM cfg
  JOIN auth.users au ON au.email = cfg.user_email
  LEFT JOIN public.users pu ON pu.id = au.id
)

-- Create team if it doesn't exist. Handle schema variants: teams.owner_id vs teams.created_by
, create_team AS (
  SELECT NULL
  FROM u, cfg
  WHERE NOT EXISTS (
    SELECT 1 FROM public.teams t WHERE t.name = cfg.team_name
  )
)

-- Insert team depending on column availability
SELECT
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'owner_id'
    ) THEN (
      -- owner_id flavor
      INSERT INTO public.teams (name, description, owner_id)
      SELECT cfg.team_name, cfg.team_description, u.public_user_id
      FROM u, cfg
      WHERE NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.name = cfg.team_name)
      RETURNING id
    )::uuid
    ELSE (
      -- created_by flavor
      INSERT INTO public.teams (name, description, created_by)
      SELECT cfg.team_name, cfg.team_description, u.public_user_id
      FROM u, cfg
      WHERE NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.name = cfg.team_name)
      RETURNING id
    )::uuid
  END AS new_team_id
INTO TEMP TABLE maybe_new_team;

-- Get the team id (existing or newly created)
WITH cfg AS (
  SELECT 'Test Team'::text AS team_name
)
SELECT id 
INTO TEMP TABLE target_team
FROM public.teams t 
JOIN cfg ON t.name = cfg.team_name
LIMIT 1;

-- Add membership if missing
INSERT INTO public.team_members (team_id, user_id, role, permissions)
SELECT 
  tt.id AS team_id,
  u.public_user_id AS user_id,
  'admin'::text AS role,
  '{"all": true}'::jsonb AS permissions
FROM target_team tt, u
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_members tm 
  WHERE tm.team_id = tt.id AND tm.user_id = u.public_user_id
);

-- Output result
SELECT 
  (SELECT email FROM u) AS user_email,
  (SELECT id FROM target_team) AS team_id,
  (SELECT name FROM public.teams WHERE id = (SELECT id FROM target_team)) AS team_name,
  'OK' AS status;






