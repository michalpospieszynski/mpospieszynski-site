# Conventions

Rules that apply to every task. Screen specs in [`docs/screens/`](screens/) assume these and don't repeat them.

---

## 1. How to use these docs in a prompt

Each screen spec is self-contained. A prompt for implementing a screen can be as short as:

> Implement `docs/screens/public/03-projects-list.md`. Follow `docs/CONVENTIONS.md`. Include the backend work listed in the spec if it doesn't exist yet, tests, and PL/EN translation keys.

For foundation tasks:

> Do task **F3** from `docs/IMPLEMENTATION-PLAN.md`.

When a task reveals that a spec is wrong or incomplete, update the spec in the same change, so the docs stay the single source of truth.

---

## 2. Repository layout

```
backend/    Spring Boot API          frontend/   Angular SSR app
infra/      compose, cloudflared     docs/       specs (this folder)
```

---

## 3. Frontend (Angular)

### Components

- Standalone components only, `changeDetection: ChangeDetectionStrategy.OnPush`.
- Signals for state; `input()`, `output()`, `model()` functions; `inject()` instead of constructor injection.
- Built-in control flow (`@if`, `@for` with `track`, `@defer` for below-the-fold heavy parts).
- Zoneless change detection if the installed Angular version supports it as stable.
- No `any`. Strict TypeScript and strict templates are on.

### File and folder naming

```
src/app/features/<feature>/
├── <name>.page.ts|html|scss          routed component (one per route)
├── <name>.resolver.ts                ResolveFn for the page's data
├── components/<part>.component.ts    feature-specific parts
└── <feature>.routes.ts               only for lazy feature areas (admin)
src/app/shared/ui/                    reusable presentational components (selector prefix ui-)
src/app/core/                         singletons: LanguageService, SeoService, interceptors, tokens
src/app/api/                          generated OpenAPI client – never edit by hand
```

Component selector prefixes: `app-` for feature components, `ui-` for shared UI, `adm-` for admin-only components.

### Routing and data

- Routes are generated from the route table in `core/i18n/route-table.ts` by `buildLocalizedRoutes()`. Each route has `data: { lang: 'pl' | 'en', routeKey: RouteKey }`.
- Build links with the `localizedPath` pipe or `LanguageService.path(routeKey, params)`. Never hardcode `/projekty` or `/en/projects` in templates.
- Page data is loaded by a **route resolver** that calls the generated API client with the route's `lang`. Pages receive it through `withComponentInputBinding()` as a signal `input()`. This makes SSR deterministic and uses Angular's HTTP transfer cache automatically.
- Components never call `HttpClient` directly; they use the generated client (through a resolver or a small feature service).
- A resolver that receives 404 navigates to the not-found page and sets the response status to 404 (see [not-found spec](screens/public/10-not-found.md)).

### Translations

- Transloco, files `src/app/i18n/pl.json` and `en.json`, imported by a static loader so they are bundled with the app and SSR never fetches them over HTTP (they are source, not served assets).
- Key format: `<screen>.<section>.<item>`, e.g. `home.hero.ctaProjects`. Shared strings live under `common.*` and `nav.*`.
- No visible text hardcoded in templates, including `aria-label` and `alt`.
- Plurals with MessageFormat: `{count, plural, one {# projekt} few {# projekty} many {# projektów} other {# projektu}}`.
- Every key added to `pl.json` must exist in `en.json`; `npm run i18n:check` enforces it.
- The admin UI is Polish only; its strings still go through Transloco (`admin.*` keys, `en.json` may copy Polish) so the check stays simple.

### SEO

Every public page calls `SeoService.update()` once its data is available:

```ts
this.seo.update({
  title: data.title,                       // "– Your Name" suffix added by the service
  description: data.seoDescription,
  alternates: data.translations,           // { pl: '/projekty/x', en: '/en/projects/y' } or a routeKey
  image: data.cover?.url,
  type: 'article' | 'website',
});
```

The service sets `<title>`, meta description, canonical URL, Open Graph and Twitter tags, `hreflang` links and `<html lang>`.

### Styling

- Component SCSS uses only design tokens (`var(--color-*)`, `var(--space-*)`, `var(--step-*)`). No hex values or magic pixel numbers in components.
- Follow the house rules in [`DIRECTION.md`](../DIRECTION.md): no borders or dividers between surfaces (tone steps instead), no gradients, no shadows at rest, no monospace outside code blocks, one 16 px radius, square buttons.
- Mobile-first; breakpoints through the mixin `@include bp(sm|md|nav|lg)` (640, 960, 1100, 1280 px; `nav` is only for the header tabs).
- Class naming: BEM-like (`project-row`, `project-row__title`, `project-row--featured`).
- Respect `prefers-reduced-motion` in every animation: animate only `transform` and `opacity`, take travel distance from `var(--rise)` and press scale from `var(--press)` / `var(--press-small)` (0 and 1 under reduced motion, so fades stay and movement goes), and stop looping motion (the project graph checks the media query and drops its unfold and auto-rotation).

### Platform-specific code

- Browser-only APIs (`window`, `localStorage`, Turnstile) are accessed only in `afterNextRender()` or behind `isPlatformBrowser()`.
- Server-only logic (timings, response status) lives in providers registered in `app.config.server.ts`.

### Markdown

- Content Markdown is rendered by `ui-markdown` using `marked` with GFM and `marked-highlight` + highlight.js (common languages only), sanitised with DOMPurify (`isomorphic-dompurify` so it runs during SSR).
- The same component renders previews in the admin.

### Testing

- Unit tests for components with logic, services, pipes and resolvers.
- Playwright e2e: every acceptance criterion in a screen spec becomes a test; run in both languages where relevant.
- Use `data-testid` attributes for e2e selectors.
- Automated accessibility checks with `@axe-core/playwright` on every public page.

---

## 4. Backend (Spring Boot)

### Structure

- Package by feature: `profile`, `projects`, `skills`, `services`, `contact`, `seo`, plus `shared`.
- Inside a feature: `api` (controllers, request/response records), `domain` (entities, services), `infra` (repositories, external adapters).
- Features don't use each other's `infra` or entities; cross-feature calls go through a service interface. ArchUnit tests enforce this.

### Controllers

- Names: `Public<Feature>Controller` (`/api/v1/public/...`) and `Admin<Feature>Controller` (`/api/v1/admin/...`).
- Language parameter: `@RequestParam(defaultValue = "pl") SiteLocale lang`.
- Request and response types are Java `record`s named `<Thing>Response`, `<Thing>Request`, `<Thing>ListItem`.
- `@Operation(operationId = "...")` on every endpoint: the operationId becomes the generated Angular method name (e.g. `getPublicProject`).
- Validation with Jakarta annotations; messages from `ValidationMessages_pl/en.properties`, resolved with the request's language.

### Services and persistence

- `@Transactional(readOnly = true)` on read services; write methods `@Transactional`.
- Entities never leave the service layer; map to records (MapStruct or static `from()` factories).
- Translations: `Translations.pick(map, lang)` returns `Localized<T>(value, actualLang)` with Polish fallback, so responses can say which language they really contain.
- Optimistic locking with `@Version` on editable aggregates; a conflict returns 409.

### Errors

- Throw `NotFoundException`, `ConflictException`, `ValidationException`; a `@RestControllerAdvice` turns them into RFC 9457 `ProblemDetail` with localised `detail`.
- Field errors as `errors: [{ field, message }]` in the problem body.

### Caching

- Public reads: `@Cacheable` with a key including `lang` and filters.
- Every admin write publishes `ContentChangedEvent`; a listener evicts all public caches after commit.

### Configuration and secrets

- No credential in the repository, an image or a workflow: every secret is read from the environment (`${VAR}` in `application-prod.yml`, `process.env` on the SSR server). Production values live only in the VPS `.env`; deployment credentials only in the GitHub `production` environment ([ARCHITECTURE § 13](ARCHITECTURE.md#secrets)).
- Defaults in `application.yml` are allowed only for local development and tests (test keys, local hosts); `application-prod.yml` has no default for anything secret, so production fails to start instead of running with a dev value.
- `infra/.env.example` lists every variable with a placeholder; add a variable there and to the README table in the same change.

### Database

- Flyway scripts `V<n>__<description>.sql` in `db/migration`; never edit an applied script.
- Schema `site`; UUID keys (`gen_random_uuid()`); `timestamptz` for time; `text` with `check` constraints for enums.
- Every translation table: primary key `(parent_id, locale)`, `check (locale in ('pl','en'))`, `on delete cascade`.

### Testing

- `@WebMvcTest` per controller, including security (anonymous, non-admin JWT, admin JWT).
- `@DataJpaTest` with Testcontainers PostgreSQL for repositories and queries.
- One `@SpringBootTest` smoke test per feature.

---

## 5. Definition of done

A task is done when:

- [ ] The screen or task matches its spec, including every acceptance criterion.
- [ ] Polish and English work (where the spec covers both), including fallbacks.
- [ ] Loading, empty and error states exist where the spec lists them.
- [ ] Unit and e2e tests pass; axe reports no violations on public pages.
- [ ] Backend endpoints are documented in OpenAPI and the Angular client is regenerated.
- [ ] No hardcoded strings, colours or routes.
- [ ] The spec was updated if the implementation had to differ.
