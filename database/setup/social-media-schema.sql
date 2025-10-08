-- Social Media Publishing Schema
-- This creates tables for managing social media accounts and publishing history

-- Social media accounts table
CREATE TABLE public.social_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'facebook', 'youtube', 'tiktok')),
  account_id VARCHAR(100) NOT NULL, -- Platform-specific account ID
  account_name VARCHAR(200) NOT NULL, -- Display name
  username VARCHAR(100), -- Username/handle
  
  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Account status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  
  -- Platform-specific metadata
  metadata JSONB DEFAULT '{}',
  
  -- Account stats
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure one account per platform per user
  UNIQUE(team_id, platform, account_id)
);

-- Publishing queue table
CREATE TABLE public.publishing_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES public.content_documents(id) ON DELETE CASCADE NOT NULL,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE NOT NULL,
  
  -- Publishing details
  platform VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed', 'cancelled')),
  
  -- Content to publish
  content_text TEXT NOT NULL,
  media_urls TEXT[], -- Array of media URLs
  hashtags TEXT[], -- Array of hashtags
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Publishing result
  platform_post_id VARCHAR(100), -- ID returned by the platform
  platform_url TEXT, -- URL of the published post
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Publishing history table (for analytics)
CREATE TABLE public.publishing_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES public.content_documents(id) ON DELETE CASCADE NOT NULL,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE NOT NULL,
  queue_id UUID REFERENCES public.publishing_queue(id) ON DELETE SET NULL,
  
  platform VARCHAR(20) NOT NULL,
  platform_post_id VARCHAR(100) NOT NULL,
  platform_url TEXT,
  
  -- Content details
  content_text TEXT NOT NULL,
  media_count INTEGER DEFAULT 0,
  hashtag_count INTEGER DEFAULT 0,
  
  -- Publishing details
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'deleted', 'hidden')),
  
  -- Performance metrics (updated periodically)
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  
  -- Last metrics update
  metrics_updated_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform-specific settings table
CREATE TABLE public.platform_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  platform VARCHAR(20) NOT NULL,
  
  -- Platform-specific settings
  settings JSONB DEFAULT '{}',
  
  -- Rate limiting
  posts_per_day INTEGER DEFAULT 10,
  posts_per_hour INTEGER DEFAULT 2,
  min_interval_minutes INTEGER DEFAULT 30,
  
  -- Content preferences
  default_hashtags TEXT[],
  auto_hashtags BOOLEAN DEFAULT false,
  hashtag_limit INTEGER DEFAULT 5,
  
  -- Scheduling preferences
  optimal_posting_times JSONB DEFAULT '{}', -- {"monday": ["09:00", "14:00"], ...}
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(team_id, platform)
);

-- Create indexes for better performance
CREATE INDEX idx_social_accounts_team_id ON public.social_accounts(team_id);
CREATE INDEX idx_social_accounts_platform ON public.social_accounts(platform);
CREATE INDEX idx_social_accounts_user_id ON public.social_accounts(user_id);

CREATE INDEX idx_publishing_queue_team_id ON public.publishing_queue(team_id);
CREATE INDEX idx_publishing_queue_status ON public.publishing_queue(status);
CREATE INDEX idx_publishing_queue_scheduled_at ON public.publishing_queue(scheduled_at);
CREATE INDEX idx_publishing_queue_platform ON public.publishing_queue(platform);

CREATE INDEX idx_publishing_history_team_id ON public.publishing_history(team_id);
CREATE INDEX idx_publishing_history_platform ON public.publishing_history(platform);
CREATE INDEX idx_publishing_history_published_at ON public.publishing_history(published_at);
CREATE INDEX idx_publishing_history_platform_post_id ON public.publishing_history(platform_post_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Social accounts policies
CREATE POLICY "Users can view team social accounts" ON public.social_accounts
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage team social accounts" ON public.social_accounts
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

-- Publishing queue policies
CREATE POLICY "Users can view team publishing queue" ON public.publishing_queue
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage team publishing queue" ON public.publishing_queue
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

-- Publishing history policies
CREATE POLICY "Users can view team publishing history" ON public.publishing_history
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Platform settings policies
CREATE POLICY "Users can view team platform settings" ON public.platform_settings
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage team platform settings" ON public.platform_settings
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_social_accounts_updated_at 
  BEFORE UPDATE ON public.social_accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publishing_queue_updated_at 
  BEFORE UPDATE ON public.publishing_queue 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publishing_history_updated_at 
  BEFORE UPDATE ON public.publishing_history 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at 
  BEFORE UPDATE ON public.platform_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
