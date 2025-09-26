-- Migration script to upgrade to improved content management schema
-- This handles the existing content_documents table with proper order

-- Step 1: Create new tables first (without foreign key references)
CREATE TABLE IF NOT EXISTS public.content_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.content_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  platform VARCHAR(50) NOT NULL,
  template_content TEXT NOT NULL,
  variables JSONB,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.content_campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.content_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_id UUID REFERENCES public.content_documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.content_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_id UUID REFERENCES public.content_documents(id) ON DELETE CASCADE NOT NULL,
  platform VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value INTEGER NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.content_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_tags (
  document_id UUID REFERENCES public.content_documents(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.content_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

-- Step 2: Add new columns to existing content_documents table
ALTER TABLE public.content_documents 
ADD COLUMN IF NOT EXISTS campaign_id UUID,
ADD COLUMN IF NOT EXISTS category_id UUID,
ADD COLUMN IF NOT EXISTS template_id UUID,
ADD COLUMN IF NOT EXISTS platform VARCHAR(50),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS topic VARCHAR(200),
ADD COLUMN IF NOT EXISTS tone VARCHAR(50),
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS hashtags TEXT[],
ADD COLUMN IF NOT EXISTS mentions TEXT[],
ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100),
ADD COLUMN IF NOT EXISTS generation_prompt TEXT,
ADD COLUMN IF NOT EXISTS generation_metadata JSONB,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS published_url TEXT,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_document_id UUID,
ADD COLUMN IF NOT EXISTS assigned_to UUID;

-- Step 3: Add foreign key constraints after columns exist
ALTER TABLE public.content_documents 
ADD CONSTRAINT fk_content_documents_campaign 
  FOREIGN KEY (campaign_id) REFERENCES public.content_campaigns(id) ON DELETE SET NULL;

ALTER TABLE public.content_documents 
ADD CONSTRAINT fk_content_documents_category 
  FOREIGN KEY (category_id) REFERENCES public.content_categories(id) ON DELETE SET NULL;

ALTER TABLE public.content_documents 
ADD CONSTRAINT fk_content_documents_template 
  FOREIGN KEY (template_id) REFERENCES public.content_templates(id) ON DELETE SET NULL;

ALTER TABLE public.content_documents 
ADD CONSTRAINT fk_content_documents_parent 
  FOREIGN KEY (parent_document_id) REFERENCES public.content_documents(id) ON DELETE SET NULL;

ALTER TABLE public.content_documents 
ADD CONSTRAINT fk_content_documents_assigned 
  FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;

-- Step 4: Update existing records to have proper platform and status
UPDATE public.content_documents 
SET platform = 'linkedin', status = 'draft' 
WHERE platform IS NULL;

-- Step 5: Enable RLS on new tables
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for new tables
DROP POLICY IF EXISTS "Team members can access content categories" ON public.content_categories;
CREATE POLICY "Team members can access content categories" ON public.content_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = content_categories.team_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can access content templates" ON public.content_templates;
CREATE POLICY "Team members can access content templates" ON public.content_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = content_templates.team_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can access content campaigns" ON public.content_campaigns;
CREATE POLICY "Team members can access content campaigns" ON public.content_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = content_campaigns.team_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can access content comments" ON public.content_comments;
CREATE POLICY "Team members can access content comments" ON public.content_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.content_documents cd ON cd.team_id = tm.team_id
      WHERE cd.id = content_comments.document_id AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can access content analytics" ON public.content_analytics;
CREATE POLICY "Team members can access content analytics" ON public.content_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.content_documents cd ON cd.team_id = tm.team_id
      WHERE cd.id = content_analytics.document_id AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can access content tags" ON public.content_tags;
CREATE POLICY "Team members can access content tags" ON public.content_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = content_tags.team_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can access document tags" ON public.document_tags;
CREATE POLICY "Team members can access document tags" ON public.document_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.content_documents cd ON cd.team_id = tm.team_id
      WHERE cd.id = document_tags.document_id AND tm.user_id = auth.uid()
    )
  );

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_documents_campaign_id ON public.content_documents(campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_documents_category_id ON public.content_documents(category_id);
CREATE INDEX IF NOT EXISTS idx_content_documents_status ON public.content_documents(status);
CREATE INDEX IF NOT EXISTS idx_content_documents_platform ON public.content_documents(platform);
CREATE INDEX IF NOT EXISTS idx_content_documents_created_by ON public.content_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_content_documents_scheduled_at ON public.content_documents(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_content_analytics_document_id ON public.content_analytics(document_id);
CREATE INDEX IF NOT EXISTS idx_content_analytics_platform ON public.content_analytics(platform);

-- Step 8: Insert default categories for each team
INSERT INTO public.content_categories (team_id, name, description, color)
SELECT 
  t.id as team_id,
  'Social Media' as name,
  'Social media posts and updates' as description,
  '#3B82F6' as color
FROM public.teams t
WHERE NOT EXISTS (
  SELECT 1 FROM public.content_categories cc WHERE cc.team_id = t.id
);

INSERT INTO public.content_categories (team_id, name, description, color)
SELECT 
  t.id as team_id,
  'Blog Posts' as name,
  'Long-form blog content' as description,
  '#10B981' as color
FROM public.teams t
WHERE NOT EXISTS (
  SELECT 1 FROM public.content_categories cc WHERE cc.team_id = t.id AND cc.name = 'Blog Posts'
);

INSERT INTO public.content_categories (team_id, name, description, color)
SELECT 
  t.id as team_id,
  'Marketing' as name,
  'Marketing and promotional content' as description,
  '#F59E0B' as color
FROM public.teams t
WHERE NOT EXISTS (
  SELECT 1 FROM public.content_categories cc WHERE cc.team_id = t.id AND cc.name = 'Marketing'
);
