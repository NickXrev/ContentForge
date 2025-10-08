-- Check what's in both research tables
SELECT 'research_data' as table_name, COUNT(*) as record_count FROM research_data
UNION ALL
SELECT 'company_research' as table_name, COUNT(*) as record_count FROM company_research;

-- Show recent records from research_data
SELECT 
  id,
  team_id,
  research_type,
  created_at,
  CASE 
    WHEN research_data IS NULL THEN 'NULL'
    WHEN jsonb_typeof(research_data) = 'object' THEN 'JSONB object'
    ELSE 'Other type'
  END as data_type
FROM research_data 
ORDER BY created_at DESC 
LIMIT 5;

-- Show recent records from company_research  
SELECT 
  id,
  team_id,
  company_name,
  created_at
FROM company_research 
ORDER BY created_at DESC 
LIMIT 5;





