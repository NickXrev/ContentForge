-- Add Research Model Configuration to Admin Panel
-- Run this in your Supabase SQL editor after setting up the research tool

-- Insert research model configuration
INSERT INTO public.admin_configs (key, value, description, category, created_at, updated_at)
VALUES 
  ('research_model', 'openai/gpt-4o-mini', 'AI model used for website research and company analysis', 'ai', NOW(), NOW()),
  ('research_max_tokens', '2000', 'Maximum tokens for research analysis', 'ai', NOW(), NOW()),
  ('research_temperature', '0.3', 'Temperature setting for research analysis (0.0-1.0)', 'ai', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Show success message
SELECT 'Research model configuration added to admin panel!' as status;
