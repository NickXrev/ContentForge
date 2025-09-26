-- Team-Based Analytics System
-- Proper structure for tracking team and user activity

-- Team Analytics (aggregated team-level data)
CREATE TABLE IF NOT EXISTS public.team_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  total_content_created INTEGER DEFAULT 0,
  total_ai_requests INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  popular_platforms JSONB DEFAULT '{}',
  popular_models JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, date)
);

-- User Activity (individual user actions within teams)
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'login', 'content_created', 'ai_request', 'page_view'
  activity_data JSONB,
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(20),
  browser VARCHAR(50),
  os VARCHAR(50),
  country VARCHAR(100),
  city VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Sessions (track user sessions within teams)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  session_id VARCHAR(100) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(20),
  browser VARCHAR(50),
  os VARCHAR(50),
  country VARCHAR(100),
  city VARCHAR(100),
  UNIQUE(team_id, user_id, session_id)
);

-- User Stats (daily aggregated stats per user per team)
CREATE TABLE IF NOT EXISTS public.user_daily_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  sessions INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  content_created INTEGER DEFAULT 0,
  ai_requests INTEGER DEFAULT 0,
  time_spent INTERVAL DEFAULT '0 minutes',
  last_activity TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id, date)
);

-- Content Analytics (track content performance)
CREATE TABLE IF NOT EXISTS public.content_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.content_documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  platform VARCHAR(50),
  content_type VARCHAR(50),
  word_count INTEGER,
  creation_time INTERVAL,
  ai_model VARCHAR(100),
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.team_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Team-based access
CREATE POLICY "Team members can access team analytics" ON public.team_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_analytics.team_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access user activity" ON public.user_activity
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = user_activity.team_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access user sessions" ON public.user_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = user_sessions.team_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access user daily stats" ON public.user_daily_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = user_daily_stats.team_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access content analytics" ON public.content_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = content_analytics.team_id AND tm.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_analytics_team_date ON public.team_analytics(team_id, date);
CREATE INDEX IF NOT EXISTS idx_user_activity_team_user ON public.user_activity(team_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON public.user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_team_user ON public.user_sessions(team_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_daily_stats_team_user_date ON public.user_daily_stats(team_id, user_id, date);
CREATE INDEX IF NOT EXISTS idx_content_analytics_team_document ON public.content_analytics(team_id, document_id);

-- Function to update daily team analytics
CREATE OR REPLACE FUNCTION update_team_daily_analytics(p_team_id UUID, p_date DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.team_analytics (
    team_id, date, total_users, active_users, total_content_created, 
    total_ai_requests, total_sessions, popular_platforms, popular_models
  )
  SELECT 
    p_team_id,
    p_date,
    COUNT(DISTINCT tm.user_id) as total_users,
    COUNT(DISTINCT CASE WHEN ua.created_at::date = p_date THEN ua.user_id END) as active_users,
    COUNT(DISTINCT CASE WHEN ua.activity_type = 'content_created' THEN ua.id END) as total_content_created,
    COUNT(CASE WHEN ua.activity_type = 'ai_request' THEN ua.id END) as total_ai_requests,
    COUNT(DISTINCT us.session_id) as total_sessions,
    (
      SELECT jsonb_object_agg(platform, count)
      FROM (
        SELECT ca.platform, COUNT(*) as count
        FROM public.content_analytics ca
        WHERE ca.team_id = p_team_id AND ca.created_at::date = p_date
        GROUP BY ca.platform
      ) platform_stats
    ) as popular_platforms,
    (
      SELECT jsonb_object_agg(ai_model, count)
      FROM (
        SELECT ua.activity_data->>'model' as ai_model, COUNT(*) as count
        FROM public.user_activity ua
        WHERE ua.team_id = p_team_id AND ua.activity_type = 'ai_request' AND ua.created_at::date = p_date
        GROUP BY ua.activity_data->>'model'
      ) model_stats
    ) as popular_models
  FROM public.team_members tm
  LEFT JOIN public.user_activity ua ON ua.team_id = tm.team_id
  LEFT JOIN public.user_sessions us ON us.team_id = tm.team_id
  WHERE tm.team_id = p_team_id
  ON CONFLICT (team_id, date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    total_content_created = EXCLUDED.total_content_created,
    total_ai_requests = EXCLUDED.total_ai_requests,
    total_sessions = EXCLUDED.total_sessions,
    popular_platforms = EXCLUDED.popular_platforms,
    popular_models = EXCLUDED.popular_models;
END;
$$ LANGUAGE plpgsql;

-- Function to track user activity
CREATE OR REPLACE FUNCTION track_user_activity(
  p_team_id UUID,
  p_user_id UUID,
  p_activity_type VARCHAR(50),
  p_activity_data JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
  v_device_type VARCHAR(20);
  v_browser VARCHAR(50);
  v_os VARCHAR(50);
BEGIN
  -- Parse user agent
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
  
  -- Insert activity
  INSERT INTO public.user_activity (
    team_id, user_id, activity_type, activity_data, ip_address, user_agent,
    device_type, browser, os, created_at
  ) VALUES (
    p_team_id, p_user_id, p_activity_type, p_activity_data, p_ip_address, p_user_agent,
    v_device_type, v_browser, v_os, NOW()
  ) RETURNING id INTO v_activity_id;
  
  -- Update daily stats
  INSERT INTO public.user_daily_stats (team_id, user_id, date, last_activity)
  VALUES (p_team_id, p_user_id, CURRENT_DATE, NOW())
  ON CONFLICT (team_id, user_id, date) DO UPDATE SET
    last_activity = NOW();
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- Test the setup
SELECT 'Team-based analytics system created successfully!' as status;
