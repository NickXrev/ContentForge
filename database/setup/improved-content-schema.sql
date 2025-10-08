-- Improved Content Management Schema
-- This creates a proper content management system with organized tables

-- Content Categories (for organization)
CREATE TABLE public.content_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for UI
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Templates (reusable templates)
CREATE TABLE public.content_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  platform VARCHAR(50) NOT NULL, -- linkedin, twitter, etc.
  template_content TEXT NOT NULL,
  variables JSONB, -- Template variables like {{topic}}, {{tone}}
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Campaigns (grouped content)
CREATE TABLE public.content_campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, completed, archived
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Documents (individual pieces of content)
CREATE TABLE public.content_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES public.content_campaigns(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.content_categories(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.content_templates(id) ON DELETE SET NULL,
  
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL, -- linkedin, twitter, instagram, blog, facebook
  status VARCHAR(20) DEFAULT 'draft', -- draft, review, approved, published, archived
  
  -- Content metadata
  topic VARCHAR(200),
  tone VARCHAR(50),
  target_audience TEXT,
  hashtags TEXT[], -- Array of hashtags
  mentions TEXT[], -- Array of @mentions
  
  -- AI generation metadata
  ai_model VARCHAR(100), -- Which AI model was used
  generation_prompt TEXT, -- The prompt used to generate
  generation_metadata JSONB, -- Additional AI generation data
  
  -- Publishing metadata
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  published_url TEXT, -- URL where it was published
  
  -- Version control
  version INTEGER DEFAULT 1,
  parent_document_id UUID REFERENCES public.content_documents(id) ON DELETE SET NULL, -- For versions
  
  -- Ownership
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Comments (for collaboration)
CREATE TABLE public.content_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_id UUID REFERENCES public.content_documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Analytics (performance tracking)
CREATE TABLE public.content_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_id UUID REFERENCES public.content_documents(id) ON DELETE CASCADE NOT NULL,
  platform VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL, -- likes, shares, comments, views, clicks
  metric_value INTEGER NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Tags (for better organization)
CREATE TABLE public.content_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Many-to-many relationship between documents and tags
CREATE TABLE public.document_tags (
  document_id UUID REFERENCES public.content_documents(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.content_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

-- RLS Policies for new tables
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;

-- Team members can access their team's content
CREATE POLICY "Team members can access content categories" ON public.content_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = content_categories.team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access content templates" ON public.content_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = content_templates.team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access content campaigns" ON public.content_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = content_campaigns.team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access content documents" ON public.content_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = content_documents.team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access content comments" ON public.content_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.content_documents cd ON cd.team_id = tm.team_id
      WHERE cd.id = content_comments.document_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access content analytics" ON public.content_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.content_documents cd ON cd.team_id = tm.team_id
      WHERE cd.id = content_analytics.document_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access content tags" ON public.content_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = content_tags.team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access document tags" ON public.document_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.content_documents cd ON cd.team_id = tm.team_id
      WHERE cd.id = document_tags.document_id AND tm.user_id = auth.uid()
    )
  );

-- Indexes for better performance
CREATE INDEX idx_content_documents_team_id ON public.content_documents(team_id);
CREATE INDEX idx_content_documents_campaign_id ON public.content_documents(campaign_id);
CREATE INDEX idx_content_documents_status ON public.content_documents(status);
CREATE INDEX idx_content_documents_platform ON public.content_documents(platform);
CREATE INDEX idx_content_documents_created_by ON public.content_documents(created_by);
CREATE INDEX idx_content_documents_scheduled_at ON public.content_documents(scheduled_at);
CREATE INDEX idx_content_analytics_document_id ON public.content_analytics(document_id);
CREATE INDEX idx_content_analytics_platform ON public.content_analytics(platform);
