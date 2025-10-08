-- Simple Admin Setup - Run this in Supabase SQL Editor

-- Step 1: Create the admin_configs table
CREATE TABLE IF NOT EXISTS public.admin_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable RLS
ALTER TABLE public.admin_configs ENABLE ROW LEVEL SECURITY;

-- Step 3: Create simple policy (allow all for now)
DROP POLICY IF EXISTS "Allow all for admin configs" ON public.admin_configs;
CREATE POLICY "Allow all for admin configs" ON public.admin_configs
  FOR ALL USING (true);

-- Step 4: Insert basic configs
INSERT INTO public.admin_configs (key, value, description, category) VALUES
('ai_model', 'openai/gpt-4o-mini', 'AI model for content generation', 'ai'),
('ai_max_tokens', '1000', 'Maximum tokens for AI responses', 'ai'),
('ai_temperature', '0.7', 'AI temperature setting', 'ai'),
('app_name', 'ContentForge', 'Application name', 'system')
ON CONFLICT (key) DO NOTHING;

-- Step 5: Grant yourself admin access
UPDATE public.team_members 
SET role = 'admin' 
WHERE user_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1);

-- Step 6: Verify it worked
SELECT 'Setup complete!' as status;
SELECT key, value, category FROM public.admin_configs;
SELECT role, user_id FROM public.team_members WHERE role = 'admin';
