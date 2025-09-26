-- Grant admin access to a user
-- Replace 'your-email@example.com' with your actual email

-- First, let's see what users exist
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Grant admin role to a specific user
-- Replace the user_id with your actual user ID from the query above
UPDATE public.team_members 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@example.com'  -- Replace with your email
);

-- If you don't have a team_members record yet, create one
-- First get your user ID and team ID
INSERT INTO public.team_members (team_id, user_id, role, joined_at)
SELECT 
  t.id as team_id,
  u.id as user_id,
  'admin' as role,
  NOW() as joined_at
FROM auth.users u
CROSS JOIN public.teams t
WHERE u.email = 'your-email@example.com'  -- Replace with your email
  AND t.owner_id = u.id
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.user_id = u.id AND tm.team_id = t.id
  );

-- Verify the update worked
SELECT 
  tm.role,
  u.email,
  t.name as team_name
FROM public.team_members tm
JOIN auth.users u ON u.id = tm.user_id
JOIN public.teams t ON t.id = tm.team_id
WHERE u.email = 'your-email@example.com';  -- Replace with your email
