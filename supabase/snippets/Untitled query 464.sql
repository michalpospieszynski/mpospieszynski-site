-- Database roles for production (docs/ARCHITECTURE.md §4). Run once per Supabase project, either in the dashboard's
-- SQL editor or with psql as the project's postgres user. Safe to run again.
--
-- No password is written here (the SQL editor keeps a query history). Set the passwords afterwards from your
-- computer with psql's \password, which prompts and sends only a hash:
--
--   psql "postgresql://postgres.<project-ref>@<pooler-host>:5432/postgres?sslmode=require"
--   postgres=> \password site_app
--   postgres=> \password owner_ro
--
-- site_app: the API. It owns the `site` schema, so Flyway (running as site_app) creates and migrates its tables.
-- Leave `site` out of the Data API's exposed schemas, so nothing in it is reachable through PostgREST.
-- owner_ro: you, read-only, for psql/DBeaver/IntelliJ. Content changes go through the admin, schema changes through
-- Flyway; never by hand.

do $$
begin
  if not exists (select from pg_roles where rolname = 'site_app') then
    create role site_app login;
  end if;
  if not exists (select from pg_roles where rolname = 'owner_ro') then
    create role owner_ro login;
  end if;
end
$$;

-- Supabase's postgres user is not a superuser: it needs membership in site_app to give it the schema and to set
-- its default privileges below.
grant site_app to current_user;

create schema if not exists site authorization site_app;

grant usage on schema site to owner_ro;
grant select on all tables in schema site to owner_ro;
-- Tables Flyway creates later are readable too.
alter default privileges for role site_app in schema site grant select on tables to owner_ro;
alter role owner_ro set default_transaction_read_only = on;
