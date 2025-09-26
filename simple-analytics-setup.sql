-- Simple Analytics Setup - Run this first
-- This creates the basic tables needed for user tracking

-- Create user_analytics table
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_activity_summary table
CREATE TABLE IF NOT EXISTS public.user_activity_summary (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  total_sessions INTEGER DEFAULT 0,
  total_page_views INTEGER DEFAULT 0,
  total_content_created INTEGER DEFAULT 0,
  total_ai_requests INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_summary ENABLE ROW LEVEL SECURITY;

-- Create simple policies
CREATE POLICY "Users can read their own analytics" ON public.user_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all analytics" ON public.user_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

CREATE POLICY "Users can read their own activity summary" ON public.user_activity_summary
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all activity summaries" ON public.user_activity_summary
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON public.user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON public.user_analytics(created_at);

-- Test the setup
SELECT 'Analytics tables created successfully!' as status;
