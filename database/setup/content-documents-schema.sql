-- Create content_documents table for the collaborative editor
CREATE TABLE IF NOT EXISTS content_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
  category VARCHAR(100) DEFAULT 'general',
  platform VARCHAR(50) DEFAULT 'blog',
  word_count INTEGER DEFAULT 0,
  collaborators UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_documents_team_id ON content_documents(team_id);
CREATE INDEX IF NOT EXISTS idx_content_documents_created_by ON content_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_content_documents_status ON content_documents(status);
CREATE INDEX IF NOT EXISTS idx_content_documents_platform ON content_documents(platform);
CREATE INDEX IF NOT EXISTS idx_content_documents_updated_at ON content_documents(updated_at);

-- Enable RLS
ALTER TABLE content_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Team members can read documents from their team
CREATE POLICY "Team members can read team documents" ON content_documents
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Team members can insert documents for their team
CREATE POLICY "Team members can create documents" ON content_documents
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

-- Team members can update documents from their team
CREATE POLICY "Team members can update team documents" ON content_documents
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Team members can delete documents from their team
CREATE POLICY "Team members can delete team documents" ON content_documents
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_content_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_content_documents_updated_at ON content_documents;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_content_documents_updated_at
  BEFORE UPDATE ON content_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_content_documents_updated_at();
