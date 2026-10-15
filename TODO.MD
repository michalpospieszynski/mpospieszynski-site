## Deployment (I2–I4) – manual steps

The pipelines are in the repository (`.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `infra/deploy.sh`);
these are the steps only you can do. Details: README → Deployment, docs/ARCHITECTURE.md § 13.

- [ ] **GitHub repository**
  - [ ] Create the repository (private is fine: 2,000 free Actions minutes a month) and push `main`
  - [ ] Settings → Code security: enable secret scanning and push protection
  - [ ] Settings → Branches: protect `main` and require the CI checks (Secret scan, Backend, Frontend, End-to-end) on pull requests
  - [ ] Open a test pull request and check that CI is green and under ~15 minutes
- [ ] **Create the Cloudflare tunnel and route DNS** (from your computer, with `cloudflared` installed)
  - [ ] `cloudflared tunnel login`
  - [ ] `cloudflared tunnel create site` – note the tunnel id (goes to `TUNNEL_ID` in `.env`) and where the credentials JSON was saved
  - [ ] `cloudflared tunnel route dns site mpospieszynski.pl`
  - [ ] `cloudflared tunnel route dns site www.mpospieszynski.pl` (plus a redirect rule www → apex in Cloudflare)
- [ ] **Prepare the VPS** (Docker with Compose 2.24 or newer)
  - [ ] Create a `gha` user in the `docker` group with key-only SSH; put the public half of a new key pair in its `authorized_keys`
  - [ ] As `gha`: `mkdir -p /opt/site/cloudflared`
  - [ ] Copy the tunnel credentials JSON to `/opt/site/cloudflared/credentials.json`, then `chown 65532:65532` and `chmod 400` it
  - [ ] Create `/opt/site/.env` from `infra/.env.example` with the real values (`REGISTRY=ghcr.io/<your-github-user-lowercase>`), owned by `gha`, `chmod 600`
  - [ ] As `gha`: `docker login ghcr.io` once with a fine-grained token that can only read packages (skip this if you make the packages public after the first push)
- [ ] **GitHub environment `production`** (Settings → Environments; optionally you as required reviewer)
  - [ ] Secrets: `DEPLOY_SSH_KEY` (private key of `gha`), `DEPLOY_HOST`, `DEPLOY_USER` (`gha`), `DEPLOY_KNOWN_HOSTS` (`ssh-keyscan -p <port> <host>`, fingerprint checked against the VPS console)
  - [ ] Variables: `SITE_URL` = `https://mpospieszynski.pl`; `DEPLOY_PORT` only if SSH is not on 22
- [ ] **First deployment**
  - [ ] Push to `main` (or Actions → Deploy → Run workflow) and watch the Deploy run
  - [ ] Check: https://mpospieszynski.pl and https://mpospieszynski.pl/en load; on the VPS `cd /opt/site && docker compose --env-file .env --env-file release.env ps` shows `web` and `api` healthy
  - [ ] Try a rollback once: Actions → Deploy → Run workflow with the full SHA of the previous commit (or `./deploy.sh --previous` on the VPS)
- [ ] **Database access from your computer:** log in with `owner_ro` (infra/supabase/roles.sql) and run a read-only query
