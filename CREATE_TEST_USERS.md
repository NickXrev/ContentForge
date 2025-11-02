# Creating Test Users for ContentForge

## Quick Method: Using the Admin API

### Option 1: Using cURL

```bash
# Create a test user
curl -X POST http://localhost:3000/api/admin/create-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-admin-token-123" \
  -d '{
    "email": "test@contentforge.com",
    "password": "testpassword123",
    "full_name": "Test User"
  }'

# Create a user for your colleague
curl -X POST http://localhost:3000/api/admin/create-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-admin-token-123" \
  -d '{
    "email": "colleague@contentforge.com",
    "password": "colleague123",
    "full_name": "Your Colleague Name"
  }'
```

### Option 2: Using the Node.js Script

1. Make sure you have your `.env.local` file set up with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Run the script:
   ```bash
   node scripts/create-test-user.js test@contentforge.com testpassword123 "Test User"
   node scripts/create-test-user.js colleague@contentforge.com colleague123 "Your Colleague Name"
   ```

### Option 3: Using the Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Users**
3. Click **"Add user"** → **"Create new user"**
4. Enter:
   - Email: `test@contentforge.com`
   - Password: `testpassword123`
   - Auto Confirm User: ✅ (checked)
5. Click **"Create user"**

6. Then ensure the user has a team:
   - The user will be automatically set up with a team when they first sign in (via the `/api/users/upsert` endpoint)
   - Or you can manually create the team in the database

## Recommended Test Users

### User 1: For You (Development)
- **Email**: `dev@contentforge.com`
- **Password**: `devpassword123`
- **Full Name**: `Developer User`

### User 2: For Your Colleague (Presentation)
- **Email**: `demo@contentforge.com`
- **Password**: `demopassword123`
- **Full Name**: `Demo User`

## What Gets Created

When a user is created via the API or script, the following is automatically set up:

1. ✅ **Auth User** - User in Supabase Auth
2. ✅ **User Profile** - Entry in `public.users` table
3. ✅ **Team** - A personal team with the user as owner
4. ✅ **Team Membership** - Entry in `team_members` table with admin role

## Login Details Template

You can share these credentials:

```
ContentForge Login Details

URL: http://localhost:3000 (or your deployed URL)

Email: demo@contentforge.com
Password: demopassword123

Note: This account has full access to create content, manage teams, and use all features.
```

## Security Note

⚠️ **For Production**: 
- Change the `ADMIN_API_TOKEN` in your environment variables
- Remove or restrict the admin create-user endpoint
- Use Supabase Dashboard for user management instead

## Troubleshooting

If users can't log in:
1. Check that the user was created in Supabase Auth dashboard
2. Verify email confirmation status (should be auto-confirmed)
3. Check that user exists in `public.users` table
4. Verify team and team_members entries exist

