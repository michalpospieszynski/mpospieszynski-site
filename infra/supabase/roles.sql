-- Database roles for production (docs/ARCHITECTURE.md §4). Run once per Supabase project, either in the dashboard's
-- SQL editor or with psql as the project's postgres user. Safe to run again.
--
-- Three users, and where each one is used:
--
--   | Role     | Used by                                   | Where its user/password go                                 |
--   |----------|-------------------------------------------|------------------------------------------------------------|
--   | postgres | you, once: this script and the passwords  | nowhere; typed only when you connect with psql (step 2)    |
--   | site_app | the API (and Flyway inside it)            | VPS /opt/site/.env: SUPABASE_DB_USER, SUPABASE_DB_PASSWORD |
--   | owner_ro | you, read-only (psql, DBeaver, IntelliJ)  | your database client on your computer only                 |
--
-- Steps:
--
-- 1. Run this file as postgres (SQL editor: paste it and Run). It creates site_app and owner_ro without passwords;
--    no password is ever written here, because the SQL editor keeps a query history.
--
-- 2. Set the two passwords from your computer with psql's \password, which prompts and sends only a hash.
--    Connection details: Supabase dashboard → Connect → "Session pooler" (host, port 5432, user
--    postgres.<project-ref>). The postgres password is the one chosen when the project was created; reset it under
--    Project Settings → Database if you don't have it.
--
--      psql "postgresql://postgres.<project-ref>@<pooler-host>:5432/postgres?sslmode=require"
--      postgres=> \password site_app
--      postgres=> \password owner_ro
--
-- 3. Put the site_app login into /opt/site/.env on the VPS (never into GitHub or this repository):
--
--      SUPABASE_DB_URL=jdbc:postgresql://<pooler-host>:5432/postgres?sslmode=require
--      SUPABASE_DB_USER=site_app.<project-ref>       (the pooler needs the project ref after the role name)
--      SUPABASE_DB_PASSWORD=<the password set for site_app in step 2>
--
--    Then deploy (or run ./deploy.sh <sha> in /opt/site): the API connects as site_app and Flyway creates the tables.
--
-- 4. Use owner_ro in your own database client: same pooler host, port 5432, database postgres, user
--    owner_ro.<project-ref>, SSL required, and the owner_ro password from step 2. It can only read.
--
-- site_app owns the `site` schema, so Flyway (running as site_app) creates and migrates its tables. Leave `site` out
-- of the Data API's exposed schemas, so nothing in it is reachable through PostgREST. Content changes go through the
-- admin, schema changes through Flyway; never by hand with owner_ro or postgres.

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
