# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Portfolio site for mpospieszynski.pl: Polish at `/`, English at `/en`, owner-only admin at `/admin`. **Done: B1–B6, F1–F6, I1, the public screens S1–S10 and the admin A1–A10, I2 (production images, compose, tunnel, security headers) and the redesign R1 (DIRECTION.md). I3/I4 pipelines are written but not run yet (no repository): the manual steps are in `TODO.MD`.**

- `backend/`: Spring Boot 4.1, Gradle 9.8 wrapper, Java 21. Flyway schema `site` (V1 tables, V2 technologies, `db/dev` sample content). `shared/` holds security (Supabase JWT), i18n (`?lang=`), ProblemDetail errors, Server-Timing, caches evicted on `ContentChangedEvent`, and media storage (local disk in dev, Supabase in prod). Public endpoints: profile, projects (list + `/{slug}`), technologies, skills, services and `POST /contact` (Turnstile, Bucket4j 5/h per hashed IP, honeypot, mail after commit). Public reads use `JdbcClient` read queries with the Polish fallback (`*/infra/Public*Queries`), cached per language; Admin endpoints (`Admin*Controller`, `/api/v1/admin/**`) cover every feature plus `media` (upload, alt texts, usages) and `dashboard`; writes go through JPA entities with `@Version` (stale version → 409) and publish `ContentChangedEvent`. The dev sample (`db/dev/R__dev_sample_content.sql`) covers every state the e2e tests need (draft project, Polish-only project/service, inactive service, hidden technology); `DevMediaSamples` copies `resources/dev-media/*` into local storage. ArchUnit enforces package rules and an `operationId` on every endpoint.
- `infra/`: `docker-compose.dev.yml` (PostgreSQL on host port 5433, Mailpit) and the production `docker-compose.yml` (cloudflared, web, api; images from `backend/Dockerfile` and `frontend/Dockerfile`), `cloudflared/config.yml` (path ingress), `.env.example` (placeholders only), `deploy.sh` (the only way to switch releases on the VPS: `TAG` in `release.env`, health-checked, `--previous` rollback) and `supabase/roles.sql` (`site_app`, `owner_ro`).
- `.github/workflows/`: `ci.yml` (gitleaks with `.gitleaks.toml`, backend `check`, frontend unit/i18n/contrast/build, Playwright e2e on the dev stack with local Supabase Auth; no secrets) and `deploy.yml` (push to `main`: CI, images to GHCR tagged with the SHA, SSH to the VPS in the `production` environment, health check; manual run with `tag` = rollback). Lint changes with actionlint.
- `frontend/`: Angular 22 SSR, zoneless, Vitest. `admin/**` is client-only; everything else is server-rendered.
  - Design tokens are in `src/styles/tokens.scss` (Emerald Ink, dark and light via `:root[data-theme]`, switched by `core/theme/theme.service.ts` and applied before paint by the script in `index.html`; Syne and Manrope self-hosted via `@fontsource-variable`). Components use only semantic `--color-*` names.
  - i18n: Transloco with bundled `src/app/i18n/*.json`; ICU plurals through `core/i18n/icu-transpiler.ts` (`Intl.PluralRules`, no MessageFormat code generation, so the CSP needs no `'unsafe-eval'`). The route table is in `core/i18n/`; add new pages to `buildLocalizedRoutes({...})` in `app.routes.ts`.
  - API: the generated client is in `src/app/api/` (do not edit it; run `npm run api:generate`) and `ApiError` comes from `apiErrorInterceptor`. In the browser, `API_BASE_URL` is the page origin. On the server it is `API_INTERNAL_URL` (dev `http://localhost:8080`, prod `http://api:8080`), and `HTTP_TRANSFER_CACHE_ORIGIN_MAP` maps it to the public origin so hydration makes no repeat requests.
  - Security headers: `src/server-security.ts` (per-request script nonce CSP, production builds only) used by `src/server.ts`, which also serves `/healthz` and `/config.json`. Fonts are emitted to `/fonts` because `/media/*` belongs to the API in the tunnel.
  - SEO: `SeoService.update()` sets title, description, canonical, og, hreflang and JSON-LD (`core/seo/`).
  - Shared UI is in `shared/ui/` (pill button with primary/ink/ghost/text variants, tech tag, project rows, field, markdown with DOMPurify, and others); page patterns (`.container`, `.section`, `.page-head`, `.columns`, `.rows`, `.card`, `.cta`, `.tags`) are global in `src/styles/_layout.scss`. The dev-only style guide at `/dev/style-guide` has an axe button.
  - Pages: `layout/` (shell: header, language hint, footer) and `features/{home,projects,skills,services,about,contact,privacy,not-found}`. Content pages resolve their data; an API 404 goes through `orNotFound(lang)` (not-found page, URL kept, HTTP 404). Home is the redesign's one page (hero with the canvas project graph in `features/home/project-graph/`, services, projects band, contact) and shares `ContactFormComponent` with `/kontakt`.
  - With `<base href="/">`, never write `href="#id"`: use a router link with `fragment`, or focus the target in a click handler.
  - Admin (`features/admin/`, lazy, Polish or English by the owner's choice): Angular Material themed from tokens (`src/styles/admin.scss`, a non-injected bundle), texts in `features/admin/i18n/admin.{pl,en}.json` (keys checked by `i18n:check`; admin API calls send `Accept-Language`), Supabase Auth via `AuthService`, which plugs into the root `core/auth/admin-session.ts` (the bearer interceptor; supabase-js stays out of the public bundle). Shared admin pieces are in `features/admin/shared/` (lang tabs, Markdown editor, media picker, one side-panel item editor, unsaved-changes guard).
- Requirements: backend tests need Docker running; the frontend needs Node 24 LTS. `jsdom` is external to the server bundle (isomorphic-dompurify), so the SSR runtime needs production `node_modules`.

The docs are the source of truth. If an implementation must differ from a spec, update the spec in the same change.

## How work is requested

- "Implement `docs/screens/<area>/<file>.md`" → the screen, any backend endpoints it needs, tests for every acceptance criterion, PL/EN translation keys.
- "Do task B2" → `docs/IMPLEMENTATION-PLAN.md`. Order: B1–B6 + F1–F6 (I1 before B2) → S1–S10 → A1–A10 → I2–I4. Each task's "Done when" is the bar.
- Always follow `docs/CONVENTIONS.md`, including its Definition of Done.

Where to look: data model and API → `docs/ARCHITECTURE.md` §9–10; shared components → `docs/UI-UX-DESIGN.md`; per-screen contract → `docs/screens/`.

**Visual direction → `DIRECTION.md`** (fonts, colours, layout, motion). It overrides the visual parts of `docs/UI-UX-DESIGN.md` (§5, §6 colour and type, §8). Take type and colour from that file, never from a new draw of the design skill. The redesign it describes came from `docs/redesign/HANDOFF.md`.

## Everyday tooling (required)

- **CodeGraph** (`.codegraph/` at the repo root): query it with `codegraph_explore` (or `codegraph explore "<symbols>"`) before grep or reading files. After every change to the codebase, run `codegraph sync` from the repo root so the index stays current.
- **Caveman**: work through the caveman layer for this project. Start sessions with `caveman claude` (its hooks and the `caveman` MCP server are installed user-wide). Pass large tool output through `caveman_compress`, and use `caveman_retrieve` with the `ccr_` handle when a dropped detail is needed. `caveman status` shows what the layer did.
- **ECC plugin** (`ecc@ecc`, https://github.com/affaan-m/ecc, v2.2.3, enabled in `~/.claude/settings.json`). Use its namespaced commands and skills as the development contract:
  - Plan before non-trivial work: `/ecc:plan` (or `/ecc:prp-plan` for a larger feature). Use the `architect`/`planner` agents for design questions.
  - Build test-first: the `ecc:tdd-workflow` skill (`ecc:springboot-tdd` for the backend, `ecc:angular-developer` and `ecc:e2e-testing` for the frontend).
  - Build failures: `/ecc:build-fix` (`ecc:java-build-resolver` for Gradle).
  - Before reporting a task done: `/ecc:quality-gate` and the `ecc:verification-loop` skill, then `/ecc:code-review`. Use the `ecc:java-reviewer`, `ecc:typescript-reviewer`, `ecc:security-reviewer` and `ecc:database-reviewer` agents for the touched areas.
  - Docs and i18n: `/ecc:update-docs` when a spec changes, and the `ecc:i18n-sync` skill for `pl.json`/`en.json`.
  - Check the install with `/plugin list ecc@ecc` (must be enabled) or `npx ecc-universal@2.2.3 doctor`.
  - These steps add to the project rules; they never replace `docs/CONVENTIONS.md`, its Definition of Done, or the animation review below.

## Stack

- **backend/**: Spring Boot (Java 21, Gradle with Kotlin DSL and the wrapper), modular monolith, package `pl.mpospieszynski.site`.
- **frontend/**: Angular SSR, Transloco, generated OpenAPI client.
- **Supabase**: Auth (admin JWT), PostgreSQL (schema `site`, Flyway-owned, not exposed via Data API), Storage (`media` bucket). No service-role key anywhere.
- **infra/**: three Docker containers on the owner's VPS (`cloudflared`, `web`, `api`) with Docker Compose behind Cloudflare Tunnel (Free plan, no nginx, no published ports). `/api/*`, `/media/*`, `/sitemap.xml`, `/robots.txt` → api:8080; everything else → web:4000. The database is Supabase (outside the VPS, reachable from a local client with the read-only `owner_ro` role).
- **CI/CD**: GitHub Actions + GHCR (not Codemagic: free plan is macOS-only, no Docker). Secrets: runtime ones only in the VPS `.env`; deployment ones only in the GitHub `production` environment. Never hard-code a credential (docs/CONVENTIONS.md, Configuration and secrets).

## Commands

```bash
docker compose -f infra/docker-compose.dev.yml up -d                  # PostgreSQL :5433 + Mailpit :1025/:8025
cd backend && ./gradlew bootRun --args='--spring.profiles.active=dev'   # API :8080 with sample data
cd backend && ./gradlew check                                        # unit + Testcontainers + ArchUnit
cd backend && ./gradlew test --tests 'pl.mpospieszynski.site.projects.*'   # one package or class
cd frontend && npm start                 # :4200 and :4200/en
cd frontend && npm run api:generate      # after any backend API change (API on :8080; --offline reuses openapi/site-api.json)
cd frontend && npm test && npm run i18n:check && npm run e2e   # e2e: dev API + DB + Mailpit (+ local Supabase for admin); installed Chrome
cd frontend && npm run supabase:keys && npm run supabase:start   # local Supabase Auth for /admin (seed users in supabase/seed.sql)
cd frontend && npm run build && npm run serve:ssr   # set API_INTERNAL_URL=http://localhost:8080 locally
cd frontend && npm run check:contrast    # every colour pair in src/styles/contrast-pairs.json, both themes
```

## Key rules

**Backend**
- Feature packages (`profile`, `projects`, `skills`, `services`, `contact`, `seo`) each with `api/domain/infra`; no cross-feature access to entities or `infra` (ArchUnit).
- `Public<X>Controller` at `/api/v1/public/...` with `?lang=pl|en`; `Admin<X>Controller` at `/api/v1/admin/...`. Every endpoint has an `operationId` (becomes the Angular method name).
- Translatable data: `*_translation` tables keyed `(parent_id, locale)`, Polish required. Use `Translations.pick()`; responses include `lang` and `translations`.
- Admin writes publish `ContentChangedEvent` to evict public caches. Errors are RFC 9457 `ProblemDetail`.
- Never edit an applied Flyway script; migrations must stay backward compatible (rollback = previous image).

**Frontend**
- Routes come from `core/i18n/route-table.ts`; never hardcode paths (use `localizedPath` / `LanguageService.path()`).
- Page data comes through resolvers using the generated client; never edit `src/app/api/` or call `HttpClient` from components.
- No visible text in templates; keys live in `src/app/i18n/pl.json` and `en.json` and must match.
- Styles use design tokens only. Browser-only APIs go behind `afterNextRender()` / `isPlatformBrowser()`. Admin is client-rendered.

## Animation review after frontend work

Motion is judged against `DIRECTION.md` (Motion): the project graph's unfold and rotation as the only non-interactive motion (no scroll-reveal or section entrances), the panel rise, feedback on every control (`--press`), transform and opacity only, and a `prefers-reduced-motion` fallback that keeps content and drops travel (`--rise`, `--press` become 0/1).

- **After every frontend task that adds or changes motion** (F2, F6, S1–S10, A1–A10, or any UI fix): run the `improve-animations` skill scoped to the changed files and fix what it finds before reporting the task as done.
- **After each frontend phase** (F1–F6 done, public screens S1–S10 done, admin A1–A10 done) and before deployment (I4): run `improve-animations` for a project-wide audit. It is read-only and returns a prioritised plan; show the plan to the user and implement the agreed items as separate changes.
- In both cases, check the reduced-motion behaviour and that no content stays hidden if scripts fail, and mention the review and its outcome in the task report.
