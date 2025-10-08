-- Quick admin setup - run these one by one

-- Step 1: Find your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Step 2: Find your team ID  
SELECT id, name, owner_id FROM public.teams WHERE owner_id = 'your-user-id-here';

-- Step 3: Update your role to admin (replace the IDs with actual values)
UPDATE public.team_members 
SET role = 'admin' 
WHERE user_id = 'your-user-id-here' 
  AND team_id = 'your-team-id-here';

-- Step 4: Verify it worked
SELECT 
  tm.role,
  u.email,
  t.name as team_name
FROM public.team_members tm
JOIN auth.users u ON u.id = tm.user_id
JOIN public.teams t ON t.id = tm.team_id
WHERE u.email = 'your-email@example.com';
