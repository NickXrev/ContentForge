-- Enhanced User Tracking System
-- This creates comprehensive user analytics and tracking

-- User Analytics Table
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  session_id VARCHAR(100),
  event_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'page_view', 'content_created', 'ai_request', etc.
  event_data JSONB, -- Flexible data storage for different event types
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
  browser VARCHAR(100),
  os VARCHAR(100),
  country VARCHAR(100),
  city VARCHAR(100),
  referrer TEXT,
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  country VARCHAR(100),
  city VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- User Activity Summary Table (for quick lookups)
CREATE TABLE IF NOT EXISTS public.user_activity_summary (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  total_sessions INTEGER DEFAULT 0,
  total_page_views INTEGER DEFAULT 0,
  total_content_created INTEGER DEFAULT 0,
  total_ai_requests INTEGER DEFAULT 0,
  last_login TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE,
  preferred_device VARCHAR(50),
  preferred_browser VARCHAR(100),
  preferred_os VARCHAR(100),
  most_common_country VARCHAR(100),
  most_common_city VARCHAR(100),
  total_time_spent INTERVAL DEFAULT '0 minutes',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Users Table (add more fields)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS preferred_device VARCHAR(50),
ADD COLUMN IF NOT EXISTS preferred_browser VARCHAR(100),
ADD COLUMN IF NOT EXISTS preferred_os VARCHAR(100),
ADD COLUMN IF NOT EXISTS most_common_country VARCHAR(100),
ADD COLUMN IF NOT EXISTS most_common_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100),
ADD COLUMN IF NOT EXISTS language VARCHAR(10),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_ip_address INET,
ADD COLUMN IF NOT EXISTS registration_source VARCHAR(100), -- 'direct', 'google', 'referral', etc.
ADD COLUMN IF NOT EXISTS referral_source TEXT,
ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100);

-- Enable RLS
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read their own analytics" ON public.user_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all analytics" ON public.user_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

CREATE POLICY "Users can read their own sessions" ON public.user_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all sessions" ON public.user_sessions
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON public.user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON public.user_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_activity_summary_user_id ON public.user_activity_summary(user_id);

-- Function to update user activity summary
CREATE OR REPLACE FUNCTION update_user_activity_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_activity_summary (user_id, total_sessions, total_page_views, total_content_created, total_ai_requests, last_activity, updated_at)
  VALUES (NEW.user_id, 0, 0, 0, 0, NEW.created_at, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    last_activity = NEW.created_at,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update activity summary
CREATE TRIGGER update_activity_summary_trigger
  AFTER INSERT ON public.user_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_user_activity_summary();

-- Function to track user events
CREATE OR REPLACE FUNCTION track_user_event(
  p_user_id UUID,
  p_event_type VARCHAR(50),
  p_event_data JSONB DEFAULT NULL,
  p_session_id VARCHAR(100) DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_page_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_analytics_id UUID;
  v_device_type VARCHAR(50);
  v_browser VARCHAR(100);
  v_os VARCHAR(100);
  v_country VARCHAR(100);
  v_city VARCHAR(100);
BEGIN
  -- Parse user agent for device info
  v_device_type := CASE 
    WHEN p_user_agent ILIKE '%mobile%' OR p_user_agent ILIKE '%android%' OR p_user_agent ILIKE '%iphone%' THEN 'mobile'
    WHEN p_user_agent ILIKE '%tablet%' OR p_user_agent ILIKE '%ipad%' THEN 'tablet'
    ELSE 'desktop'
  END;
  
  v_browser := CASE
    WHEN p_user_agent ILIKE '%chrome%' THEN 'Chrome'
    WHEN p_user_agent ILIKE '%firefox%' THEN 'Firefox'
    WHEN p_user_agent ILIKE '%safari%' THEN 'Safari'
    WHEN p_user_agent ILIKE '%edge%' THEN 'Edge'
    ELSE 'Other'
  END;
  
  v_os := CASE
    WHEN p_user_agent ILIKE '%windows%' THEN 'Windows'
    WHEN p_user_agent ILIKE '%mac%' THEN 'macOS'
    WHEN p_user_agent ILIKE '%linux%' THEN 'Linux'
    WHEN p_user_agent ILIKE '%android%' THEN 'Android'
    WHEN p_user_agent ILIKE '%iphone%' OR p_user_agent ILIKE '%ipad%' THEN 'iOS'
    ELSE 'Other'
  END;
  
  -- Insert analytics record
  INSERT INTO public.user_analytics (
    user_id, session_id, event_type, event_data, ip_address, user_agent,
    device_type, browser, os, page_url, created_at
  ) VALUES (
    p_user_id, p_session_id, p_event_type, p_event_data, p_ip_address, p_user_agent,
    v_device_type, v_browser, v_os, p_page_url, NOW()
  ) RETURNING id INTO v_analytics_id;
  
  -- Update user's last activity
  UPDATE public.users 
  SET last_activity = NOW()
  WHERE id = p_user_id;
  
  RETURN v_analytics_id;
END;
$$ LANGUAGE plpgsql;
