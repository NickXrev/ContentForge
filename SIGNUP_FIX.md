# Supabase Signup Error Fix

## Problem
You're encountering a "Database error saving new user" error during user signup. This is caused by Row Level Security (RLS) policies that prevent the user creation trigger from working properly.

## Root Cause
The issue occurs because:
1. When a user signs up, Supabase creates the user in `auth.users`
2. A trigger `on_auth_user_created` fires to create a profile in `public.users`
3. The RLS policy `"Users can insert own profile"` requires `auth.uid() = id`
4. However, during the trigger execution, the user session isn't fully established yet
5. This causes the trigger to fail with a database error

## Solution

### Option 1: Complete Fix (Recommended)
Run the `complete-signup-fix.sql` script in your Supabase SQL Editor:

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to SQL Editor

2. **Run the Fix Script**
   - Copy the contents of `contentforge/database/debug/complete-signup-fix.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

3. **Verify the Fix**
   - Run the test script: `contentforge/database/debug/test-signup-fix.sql`
   - Check that all policies and triggers are properly configured

### Option 2: Simple Fix (If Option 1 doesn't work)
If the complete fix doesn't work, try the simpler approach:

1. **Run the Simple Fix**
   - Copy the contents of `contentforge/database/debug/fix-signup-simple.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

## What the Fix Does

1. **Temporarily disables RLS** on the users table to allow the trigger to work
2. **Creates a robust trigger function** with proper error handling
3. **Re-enables RLS** with new policies that allow system operations
4. **Grants necessary permissions** to the trigger function
5. **Creates proper RLS policies** for user data access

## Key Changes

### RLS Policies
- **Before**: `"Users can insert own profile"` with `auth.uid() = id` (fails during trigger)
- **After**: `"Allow system user creation"` with `CHECK (true)` (allows trigger to work)

### Trigger Function
- Added proper error handling with `EXCEPTION` block
- Uses `SECURITY DEFINER` to run with elevated privileges
- Logs errors without failing the auth process

### Permissions
- Grants `INSERT` permission on `public.users` to the `postgres` role
- Ensures the trigger function can create user profiles

## Testing

After applying the fix:

1. **Try signing up** with a new user account
2. **Check the logs** in Supabase for any error messages
3. **Verify the user profile** was created in the `public.users` table
4. **Test login** with the new account

## Troubleshooting

### If the error persists:

1. **Check Supabase logs**:
   - Go to Logs → Auth Logs
   - Look for any error messages during signup

2. **Verify environment variables**:
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` is set correctly
   - Ensure `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly

3. **Check database permissions**:
   - Run the test script to verify triggers and policies
   - Ensure the `postgres` role has proper permissions

4. **Manual user creation**:
   - If automatic creation fails, you can manually create user profiles
   - Use the Supabase dashboard to insert records into `public.users`

### Common Issues:

- **Missing environment variables**: Check your `.env.local` file
- **Incorrect Supabase URL**: Ensure it includes `https://` and the correct project ID
- **Wrong anon key**: Make sure you're using the anon key, not the service role key
- **RLS still enabled**: The fix should handle this, but double-check the policies

## Files Created

- `contentforge/database/debug/complete-signup-fix.sql` - Main fix script
- `contentforge/database/debug/fix-signup-simple.sql` - Alternative simple fix
- `contentforge/database/debug/test-signup-fix.sql` - Verification script
- `contentforge/SIGNUP_FIX.md` - This documentation

## Next Steps

After fixing the signup issue:

1. **Test the complete flow**: Signup → Login → User profile creation
2. **Set up your environment variables** if not already done
3. **Configure additional features** like team creation and client profiles
4. **Test with multiple users** to ensure the fix works consistently

The fix ensures that user signup works properly while maintaining security through appropriate RLS policies.


