-- =============================================================================
-- V2__Add_Grafana_RO_User.sql
-- SETS UP A DEDICATED READ-ONLY USER FOR OBSERVABILITY
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'grafana_ro') THEN
        CREATE ROLE grafana_ro WITH LOGIN PASSWORD '${GRAFANA_DB_PASSWORD}';
    END IF;
END
$$;

-- Grant access to the schema
GRANT USAGE ON SCHEMA public TO grafana_ro;

-- Grant SELECT on all existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO grafana_ro;

-- Ensure future tables are also readable
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO grafana_ro;

-- Grant SELECT on sequences (if needed for some complex queries)
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO grafana_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO grafana_ro;
