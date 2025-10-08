-- View the most recent research data (just ran)
SELECT 
  id,
  team_id,
  research_type,
  created_at,
  research_data
FROM research_data 
ORDER BY created_at DESC 
LIMIT 1;
