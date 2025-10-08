-- Admin Configuration System
-- This creates a table for managing system-wide configuration variables

CREATE TABLE public.admin_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('ai', 'system', 'billing', 'features')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_configs ENABLE ROW LEVEL SECURITY;

-- Only team admins can access admin configs
CREATE POLICY "Team admins can access admin configs" ON public.admin_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

-- Insert default configuration values
INSERT INTO public.admin_configs (key, value, description, category) VALUES
-- AI Configuration
('ai_model', 'openai/gpt-4o-mini', 'Default AI model for content generation', 'ai'),
('ai_max_tokens', '1000', 'Maximum tokens for AI responses', 'ai'),
('ai_temperature', '0.7', 'AI temperature setting (0.0-1.0)', 'ai'),
('ai_system_prompt', 'You are a professional content creator who generates high-quality, engaging content for various social media platforms and blogs.', 'System prompt for AI content generation', 'ai'),

-- System Configuration
('app_name', 'ContentForge', 'Application name', 'system'),
('app_version', '1.0.0', 'Application version', 'system'),
('max_content_length', '5000', 'Maximum content length in characters', 'system'),
('default_platform', 'linkedin', 'Default content platform', 'system'),

-- Billing Configuration
('stripe_publishable_key', '', 'Stripe publishable key for payments', 'billing'),
('stripe_secret_key', '', 'Stripe secret key for payments', 'billing'),
('subscription_price_monthly', '29.99', 'Monthly subscription price', 'billing'),
('subscription_price_yearly', '299.99', 'Yearly subscription price', 'billing'),

-- Feature Flags
('enable_collaboration', 'true', 'Enable real-time collaboration features', 'features'),
('enable_analytics', 'true', 'Enable content analytics tracking', 'features'),
('enable_scheduling', 'true', 'Enable content scheduling features', 'features'),
('enable_templates', 'true', 'Enable content templates', 'features');

-- Create index for better performance
CREATE INDEX idx_admin_configs_category ON public.admin_configs(category);
CREATE INDEX idx_admin_configs_key ON public.admin_configs(key);
