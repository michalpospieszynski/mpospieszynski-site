-- Local Supabase only (supabase start / supabase db reset). Test accounts for the admin and its e2e tests.
-- These are fixtures of the local stack, not credentials: production users are created in the hosted project
-- (docs/ARCHITECTURE.md § 4) and never seeded.
--
--   admin@localhost.test      password: local-admin-password   app_metadata.role = admin
--   mfa-admin@localhost.test  password: local-admin-password   admin with a verified TOTP factor (secret below)
--   user@localhost.test       password: local-user-password    signed-in user without the admin role

create or replace function pg_temp.seed_user(uid uuid, address text, password text, app_meta jsonb) returns void
language sql as $$
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', address,
            crypt(password, gen_salt('bf')), now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb || app_meta, '{}'::jsonb, now(), now(),
            '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', address), 'email',
            now(), now(), now());
$$;

select pg_temp.seed_user('11111111-1111-4111-8111-111111111111', 'admin@localhost.test', 'local-admin-password', '{"role": "admin"}');
select pg_temp.seed_user('22222222-2222-4222-8222-222222222222', 'mfa-admin@localhost.test', 'local-admin-password', '{"role": "admin"}');
select pg_temp.seed_user('33333333-3333-4333-8333-333333333333', 'user@localhost.test', 'local-user-password', '{}');

-- TOTP for the MFA account; e2e tests compute codes from this base32 secret.
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
values ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222', 'local authenticator',
        'totp', 'verified', now(), now(), 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP');
