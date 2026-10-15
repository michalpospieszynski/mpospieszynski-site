# Admin login

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/admin/logowanie?returnUrl=` | Client only | Public (redirects if already signed in) | `src/app/features/admin/login/` | A1, Supabase Auth setup |

## Purpose

Sign the owner in with Supabase, including the TOTP step when MFA is enrolled.

## Layout

```
┌──────────────────────────────────────┐
│ Panel strony                         │
│                                      │
│ E-mail   [                     ]     │
│ Hasło    [                     ]     │
│                                      │
│ [Zaloguj się]                        │
│                                      │
│ (step 2, when MFA is enrolled)       │
│ Kod z aplikacji  [ _ _ _ _ _ _ ]     │
│ [Potwierdź]                          │
└──────────────────────────────────────┘
```

Centred card on the surface colour; no navigation.

## Content and translation keys (Polish only)

| Key | Text |
|---|---|
| `admin.login.title` | Panel strony |
| `admin.login.email` / `.password` | E-mail / Hasło |
| `admin.login.submit` / `.submitting` | Zaloguj się / Logowanie… |
| `admin.login.mfaLabel` | Kod z aplikacji uwierzytelniającej |
| `admin.login.mfaSubmit` | Potwierdź |
| `admin.login.errors.invalid` | Nieprawidłowy e-mail lub hasło. |
| `admin.login.errors.mfa` | Nieprawidłowy kod. Spróbuj ponownie. |
| `admin.login.errors.notAdmin` | To konto nie ma dostępu do panelu. |
| `admin.login.errors.network` | Nie udało się połączyć z usługą logowania. Spróbuj ponownie za chwilę. |

## Data

`supabase.auth.signInWithPassword()`; then `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`; if the next level is `aal2`, `mfa.challenge()` + `mfa.verify()` with the TOTP factor. After success, decode the access token and check `app_metadata.role`.

## Behaviour and states

- Already signed in as admin → redirect to `returnUrl` or `/admin`.
- Wrong credentials → `errors.invalid`, password field cleared and focused.
- Not admin → sign out immediately and show `errors.notAdmin`.
- MFA code input: `inputmode="numeric"`, `autocomplete="one-time-code"`, submits automatically at 6 digits.
- `returnUrl` accepted only if it starts with `/admin` (prevents open redirects).

## Technical hints

- If you choose GitHub OAuth instead of a password, replace the form with a "Zaloguj przez GitHub" button using `signInWithOAuth({ provider: 'github', options: { redirectTo: origin + '/admin' } })`; keep the role check.
- No backend work.

## Acceptance criteria

- [ ] Correct credentials (+ TOTP when enrolled) sign in and land on `returnUrl`.
- [ ] Wrong password and wrong code show the right messages.
- [ ] A non-admin account is signed out with the "no access" message.
- [ ] `returnUrl=https://evil.example` is ignored.

## Out of scope

Password reset UI (use the Supabase dashboard), sign-up.

## Implementation notes (A2, 2026-10-15)

- Email and password with Supabase Auth; the TOTP step uses `mfa.challengeAndVerify` with the verified factor.
  A session that still needs `aal2` does not pass `adminGuard`.
- Errors without an HTTP status or with 5xx (including rate limiting by the auth service) show `errors.network`.
- Locally the CLI stack (`supabase/config.toml`, sign-ups disabled) seeds `admin@localhost.test`, an MFA admin and
  a user without the role. The local sign-in rate limit is raised for the e2e suite only.
