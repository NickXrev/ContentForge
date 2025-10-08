-- Research Tool Database Schema
-- Stores website analysis and company research data

-- Company Research Profiles (enhanced client profiles with web data)
CREATE TABLE IF NOT EXISTS public.company_research (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  website_url VARCHAR(500),
  research_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Website Analysis Data
CREATE TABLE IF NOT EXISTS public.website_analysis (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  research_id UUID REFERENCES public.company_research(id) ON DELETE CASCADE NOT NULL,
  url VARCHAR(500) NOT NULL,
  title VARCHAR(500),
  description TEXT,
  meta_keywords TEXT,
  content_summary TEXT,
  extracted_text TEXT,
  word_count INTEGER,
  language VARCHAR(10) DEFAULT 'en',
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company Intelligence (structured data extracted from website)
CREATE TABLE IF NOT EXISTS public.company_intelligence (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  research_id UUID REFERENCES public.company_research(id) ON DELETE CASCADE NOT NULL,
  business_type VARCHAR(100),
  industry VARCHAR(100),
  target_audience TEXT,
  value_proposition TEXT,
  key_services TEXT[],
  key_products TEXT[],
  pricing_info TEXT,
  contact_info JSONB,
  social_media JSONB,
  company_size VARCHAR(50),
  founded_year INTEGER,
  location VARCHAR(255),
  tone_of_voice VARCHAR(100),
  brand_style VARCHAR(100),
  key_messages TEXT[],
  competitive_advantages TEXT[],
  pain_points_addressed TEXT[],
  call_to_actions TEXT[],
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competitor Analysis
CREATE TABLE IF NOT EXISTS public.competitor_analysis (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  research_id UUID REFERENCES public.company_research(id) ON DELETE CASCADE NOT NULL,
  competitor_name VARCHAR(255) NOT NULL,
  competitor_url VARCHAR(500),
  analysis_summary TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  market_position VARCHAR(100),
  pricing_strategy TEXT,
  content_strategy TEXT,
  social_presence JSONB,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Research Sources (track where data came from)
CREATE TABLE IF NOT EXISTS public.research_sources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  research_id UUID REFERENCES public.company_research(id) ON DELETE CASCADE NOT NULL,
  source_type VARCHAR(50) NOT NULL, -- 'website', 'social_media', 'news', 'directory'
  source_url VARCHAR(500),
  source_name VARCHAR(255),
  data_extracted JSONB,
  reliability_score INTEGER DEFAULT 5, -- 1-10 scale
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.company_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Team-based access
CREATE POLICY "Team members can access company research" ON public.company_research
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = company_research.team_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access website analysis" ON public.website_analysis
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.company_research cr
      JOIN public.team_members tm ON tm.team_id = cr.team_id
      WHERE cr.id = website_analysis.research_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access company intelligence" ON public.company_intelligence
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.company_research cr
      JOIN public.team_members tm ON tm.team_id = cr.team_id
      WHERE cr.id = company_intelligence.research_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access competitor analysis" ON public.competitor_analysis
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.company_research cr
      JOIN public.team_members tm ON tm.team_id = cr.team_id
      WHERE cr.id = competitor_analysis.research_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can access research sources" ON public.research_sources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.company_research cr
      JOIN public.team_members tm ON tm.team_id = cr.team_id
      WHERE cr.id = research_sources.research_id AND tm.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_company_research_team ON public.company_research(team_id);
CREATE INDEX idx_company_research_status ON public.company_research(research_status);
CREATE INDEX idx_website_analysis_research ON public.website_analysis(research_id);
CREATE INDEX idx_company_intelligence_research ON public.company_intelligence(research_id);
CREATE INDEX idx_competitor_analysis_research ON public.competitor_analysis(research_id);
CREATE INDEX idx_research_sources_research ON public.research_sources(research_id);

-- Function to update research status
CREATE OR REPLACE FUNCTION update_research_status(
  p_research_id UUID,
  p_status VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.company_research 
  SET research_status = p_status, updated_at = NOW()
  WHERE id = p_research_id;
END;
$$ LANGUAGE plpgsql;

-- Test the setup
SELECT 'Research tool database schema created successfully!' as status;
