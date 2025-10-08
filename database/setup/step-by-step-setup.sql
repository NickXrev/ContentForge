-- Step-by-step setup - Run these ONE AT A TIME in Supabase SQL Editor

-- Step 1: Create the table
CREATE TABLE public.admin_configs (
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

-- Step 3: Create policy
CREATE POLICY "Allow all for admin configs" ON public.admin_configs
  FOR ALL USING (true);

-- Step 4: Insert basic config
INSERT INTO public.admin_configs (key, value, description, category) VALUES
('ai_model', 'openai/gpt-4o-mini', 'AI model for content generation', 'ai');

-- Step 5: Grant admin access
UPDATE public.team_members 
SET role = 'admin' 
WHERE user_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1);

-- Step 6: Test - this should return the config
SELECT * FROM public.admin_configs;
