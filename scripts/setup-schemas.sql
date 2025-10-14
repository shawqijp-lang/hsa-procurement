-- Setup separate schemas for development and production
-- This ensures complete data isolation between environments

-- Create schemas
CREATE SCHEMA IF NOT EXISTS development;
CREATE SCHEMA IF NOT EXISTS production;

-- Grant permissions
GRANT ALL ON SCHEMA development TO CURRENT_USER;
GRANT ALL ON SCHEMA production TO CURRENT_USER;

-- Set default search path for current session
SET search_path TO development;

-- Show current schema
SELECT current_schema();