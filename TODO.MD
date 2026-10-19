## Deployment (I2–I4) – manual steps

The pipelines are in the repository (`.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `infra/deploy.sh`);
these are the steps only you can do. Details: README → Deployment, docs/ARCHITECTURE.md § 13.

Last verified 2026-10-19 from outside (DNS, HTTP, `cloudflared tunnel info`): ticked items were confirmed; the
GitHub settings could not be checked from here because the repository is private.

- [ ] **GitHub repository**
  - [x] Create the repository and push `main` (`origin` = github.com/michalpospieszynski/mpospieszynski-site, in sync)
  - [ ] Settings → Code security: enable secret scanning and push protection
  - [ ] Settings → Branches: protect `main` and require the CI checks (Secret scan, Backend, Frontend, End-to-end) on pull requests
  - [ ] Open a test pull request and check that CI is green and under ~15 minutes
- [x] **Cloudflare tunnel and DNS** (done from your computer: `cloudflared tunnel login`, tunnel `mpospieszynski-site`
      = `c9111d30-…`)
  - [x] `mpospieszynski.pl` and `www.mpospieszynski.pl` route to the tunnel (both resolve to Cloudflare)
  - [x] Redirect rule `www` → apex (301, path and query kept)
- [ ] **Cloudflare settings** (dashboard → mpospieszynski.pl)
  - [ ] SSL/TLS → Edge Certificates → **Always Use HTTPS: on** (today `http://mpospieszynski.pl/` answers 200 instead
        of redirecting to https)
  - [ ] Then, optionally, **HSTS** on the same page (max-age 6 months, no preload at first). The architecture expects
        HSTS from Cloudflare and no response sends `Strict-Transport-Security` yet
  - [ ] Caching → Configuration → **Custom Purge** `https://mpospieszynski.pl/favicon.ico` (Cloudflare still serves the
        old 15 kB icon; the origin already has the new one)
- [x] **Prepare the VPS**
  - [x] `gha` user with key-only SSH in the `docker` group (the deploy job logs in as `gha`)
  - [x] `/opt/site` with `cloudflared/credentials.json` (the tunnel's connector runs from the VPS, 51.38.98.232)
  - [x] `/opt/site/.env` with the real values (the API, Supabase and the site are up)
  - [x] GHCR pull access for `gha` (classic token with `read:packages`, or public packages)
- [ ] **GitHub environment `production`**
  - [x] Secrets `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KNOWN_HOSTS` (the deploy reached the VPS)
  - [ ] Variable `SITE_URL` = `https://mpospieszynski.pl`: confirm the last Deploy run's health check step is green
        (it failed earlier while the database was empty; the site now answers 200 on `/`, `/en` and the API health)
- [ ] **First deployment**
  - [x] https://mpospieszynski.pl, `/en`, `/projekty`, `/en/projects`, `/polityka-prywatnosci` and `/api/actuator/health`
        answer 200; commit `6093bce` (favicon) is live
  - [ ] Try a rollback once: Actions → Deploy → Run workflow with the full SHA of the previous commit (or
        `./deploy.sh --previous` on the VPS), then deploy the latest again
- [ ] **Commit and push the pending work** (not live yet): remembered language (`/` → `/en`), the hint for all
      non-Polish browsers, PostHog with the cookie banner, the updated privacy policy. Before pushing, run the e2e
      suite locally with Docker running (`cd frontend && npm run e2e`): the new language tests have not run yet
- [ ] **Analytics: PostHog** (docs/ANALYTICS.md §9; off until the key is set; needs the push above)
  - [ ] Create a PostHog account on the **Free** plan and a project in the **EU** region (eu.posthog.com); accept the DPA
        (Organization settings)
  - [ ] Project settings: Web analytics → **Cookieless server hash mode** on; **Discard client IP data** on; Session
        replay on (minimum duration ~2 s); retention: recordings 30 days, data 12 months; authorized URL
        `https://mpospieszynski.pl`
  - [ ] Copy the **project token** (`phc_…`, Settings → Project → General; not a secret API key) into
        `/opt/site/.env` as `POSTHOG_KEY=…` and redeploy (`./deploy.sh <sha>` or push to `main`)
  - [ ] Check in a private window: banner shows; Reject → events without cookies; Cookie settings → Accept → a
        recording with masked form fields; nothing from `/admin`; no CSP errors in the console
  - [ ] Open the toolbar from PostHog on the live site and look at a heatmap
- [ ] **Database access from your computer:** log in with `owner_ro` (infra/supabase/roles.sql) and run a read-only query
- [ ] **Before launch:** have the privacy policy and the cookie banner text reviewed by a lawyer who knows Polish
      data-protection law (docs/ANALYTICS.md §8)
