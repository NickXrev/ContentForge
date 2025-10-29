-- Create research_data table for storing AI research results
CREATE TABLE IF NOT EXISTS research_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  client_profile_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
  research_type TEXT NOT NULL CHECK (research_type IN ('perplexity', 'openrouter', 'manual')),
  research_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_research_data_team_id ON research_data(team_id);
CREATE INDEX IF NOT EXISTS idx_research_data_client_profile_id ON research_data(client_profile_id);
CREATE INDEX IF NOT EXISTS idx_research_data_research_type ON research_data(research_type);
CREATE INDEX IF NOT EXISTS idx_research_data_created_at ON research_data(created_at);

-- Enable RLS
ALTER TABLE research_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS research_data_select_policy ON research_data;
DROP POLICY IF EXISTS research_data_insert_policy ON research_data;
DROP POLICY IF EXISTS research_data_update_policy ON research_data;
DROP POLICY IF EXISTS research_data_delete_policy ON research_data;

CREATE POLICY research_data_select_policy ON research_data
  FOR SELECT USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = (
        SELECT id FROM public.users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY research_data_insert_policy ON research_data
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = (
        SELECT id FROM public.users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY research_data_update_policy ON research_data
  FOR UPDATE USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = (
        SELECT id FROM public.users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY research_data_delete_policy ON research_data
  FOR DELETE USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = (
        SELECT id FROM public.users WHERE auth_id = auth.uid()
      )
    )
  );

-- Create update trigger
CREATE OR REPLACE FUNCTION update_research_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS research_data_updated_at_trigger ON research_data;
CREATE TRIGGER research_data_updated_at_trigger
  BEFORE UPDATE ON research_data
  FOR EACH ROW
  EXECUTE FUNCTION update_research_data_updated_at();










