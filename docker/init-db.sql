-- Medipaedia PostgreSQL Initialization Script
-- Enables UUID generation, PostGIS spatial queries, and Full-Text/Trigram search extensions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Set standard timezone
SET timezone = 'UTC';
