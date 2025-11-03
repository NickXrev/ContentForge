-- Adds derived_brand_voice column to client_profiles if it does not exist
ALTER TABLE client_profiles
ADD COLUMN IF NOT EXISTS derived_brand_voice JSONB;

