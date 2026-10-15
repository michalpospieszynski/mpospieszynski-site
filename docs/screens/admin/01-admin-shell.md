# Admin shell

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/admin/**` | Client only (`RenderMode.Client`) | Admin | `src/app/features/admin/` | B3, F1, F4 |

## Purpose

Layout, navigation, authentication plumbing and shared behaviour for every admin screen. The admin is a private tool for one person, in Polish or English (the owner's choice), built with Angular Material themed with the site tokens, in the site's dark or light theme.

## Layout

```
┌────────────────┬─────────────────────────────────────────────────────────┐
│ Panel strony   │  Page title         pospieszynski.michal@gmail.com  [⎋] │
│                ├─────────────────────────────────────────────────────────┤
│ Pulpit         │                                                         │
│ Wiadomości (3) │                 <router-outlet>                         │
│ Projekty       │                                                         │
│ Umiejętności   │                                                         │
│ Usługi i FAQ   │                                                         │
│ Pliki          │                                                         │
│ Ustawienia     │                                                         │
│                │                                                         │
│ Zobacz stronę ↗│                                                         │
└────────────────┴─────────────────────────────────────────────────────────┘
```

Below 960 px the sidebar becomes a drawer opened from a toolbar button.

## Content and translation keys (Polish and English)

| Key | Text |
|---|---|
| `admin.nav.dashboard` | Pulpit |
| `admin.nav.messages` | Wiadomości |
| `admin.nav.projects` | Projekty |
| `admin.nav.skills` | Umiejętności |
| `admin.nav.services` | Usługi i FAQ |
| `admin.nav.media` | Pliki |
| `admin.nav.settings` | Ustawienia |
| `admin.nav.viewSite` | Zobacz stronę |
| `admin.nav.logout` | Wyloguj się |
| `admin.common.save` / `.saved` | Zapisz / Zapisano |
| `admin.common.publish` / `.published` | Opublikuj / Opublikowano |
| `admin.common.unpublish` / `.unpublished` | Wycofaj publikację / Publikacja wycofana |
| `admin.common.delete` / `.cancel` | Usuń / Anuluj |
| `admin.common.unsaved` | Masz niezapisane zmiany. Opuścić stronę bez zapisywania? |
| `admin.common.conflict` | Te dane zostały zmienione w innej karcie. Odśwież, aby zobaczyć najnowszą wersję. |
| `admin.common.error` | Coś poszło nie tak: {detail} |
| `admin.common.sessionExpired` | Sesja wygasła. Zaloguj się ponownie. |
| `admin.lang.pl` / `.en` | Polski / English |
| `admin.lang.status.complete` / `.partial` / `.missing` | kompletne / częściowe / brak tłumaczenia |

## Data

- Supabase session from `supabase-js` (`AuthService`).
- Unread message count for the badge: `GET /api/v1/admin/dashboard` (field `newMessages`), refreshed on navigation and every 2 minutes while the tab is visible.

## Behaviour and states

- **Guard:** `adminGuard` (`CanMatchFn`) checks for a session and the `app_metadata.role === 'admin'` claim in the access token; otherwise redirects to `/admin/logowanie?returnUrl=…`.
- **Auth interceptor:** adds `Authorization: Bearer <access token>` only for `/api/v1/admin/**`. On 401: refresh the session once and retry; if it fails again, sign out and go to login with `admin.common.sessionExpired`.
- **Errors:** a global admin error handler shows `ProblemDetail.detail` in a snackbar; 409 shows `admin.common.conflict` with a "Odśwież" action.
- **Unsaved changes:** a shared `canDeactivate` guard for editors that implement `HasUnsavedChanges` (`isDirty(): boolean`); also handles `beforeunload`.
- **Save feedback:** a shared `SaveStatus` component shows "Zapisano o 14:32".
- Logout: `supabase.auth.signOut()`, clear caches, go to login.

## Technical hints

- Lazy route: `{ path: 'admin', loadChildren: () => import('./features/admin/admin.routes') }`, with server route `admin/**` → `RenderMode.Client` so SSR never runs admin code.
- `AuthService` wraps `createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)`; config values come from a runtime `config.json` served by the SSR server (so images don't need rebuilding per environment).
- Material theme generated from tokens (`--color-stage` as primary on `--color-ground`, dark or light from the shared `data-theme`, `theme-type: color-scheme`; `src/styles/admin.scss`): pill tabs and nav links, `--color-line` hairlines, `--color-field` outlines, corners from the radius tokens; Manrope for text, Syne for page and dialog titles.
- Shared admin components in `features/admin/shared/`:
  - `adm-lang-tabs` – PL/EN tabs with status chips.
  - `adm-markdown-editor` – textarea with a small toolbar (bold, link, heading, list, code) and live preview using `ui-markdown`.
  - `adm-media-picker` – dialog from the [media](09-media.md) screen.
  - `adm-confirm-dialog` – names the item being deleted.
  - `adm-sortable-list` – CDK drag-and-drop list emitting the new order.
- Translation status helper: `translationStatus(pl, en, requiredFields)` → `complete | partial | missing`.
- Shared admin DTO pattern: `{ id, version, shared fields…, translations: { pl: {...}, en: {...} | null } }`.

## Acceptance criteria

- [ ] Visiting any `/admin` route without a session redirects to login and back after sign-in.
- [ ] A signed-in non-admin account can't open admin routes and sees the message from the login spec.
- [ ] An expired access token is refreshed transparently once; a failed refresh signs out.
- [ ] Message badge shows the number of new messages.
- [ ] Leaving an editor with unsaved changes asks for confirmation.
- [ ] SSR output for `/admin` contains no admin code or data.

## Out of scope

Multiple users and roles, audit log.

## Implementation notes (A1, 2026-10-15)

- **Auth plumbing without supabase-js in the public bundle:** `core/auth/admin-session.ts` holds a root `AdminSession`
  and the global `adminAuthInterceptor` (registered in `app.config.ts`, inside `apiErrorInterceptor` so it sees the
  raw 401). The lazy admin `AuthService` (`features/admin/auth/`) connects itself as the token source. One refresh
  is shared by parallel 401s; a refused retry signs out with `admin.common.sessionExpired` and keeps the page as
  `returnUrl`.
- **Runtime config:** `src/server.ts` serves `GET /config.json` (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, no-store).
- **Theme:** `src/styles/admin.scss` is a non-injected bundle (`angular.json`, `bundleName: "admin"`) linked by
  `adminThemeResolver` before the first admin screen; it also holds the shared `adm-*` page classes.
- **Texts:** `features/admin/i18n/admin.pl.json` and `admin.en.json` (same keys, checked by `npm run i18n:check`); the chosen one is merged under `admin.*` into both Transloco languages
  by `adminI18nResolver`, so the public bundle never loads them and the English project preview keeps a Polish
  banner. `npm run i18n:check` covers the public files only.
- **Shared admin pieces** live in `features/admin/shared/`: `adm-lang-tabs`, `adm-markdown-editor` (toolbar, preview
  side by side from 1280 px, image insert from the library), `adm-media-field` / `adm-gallery-field`,
  `adm-save-status`, `AdminUi` (snackbars, conflict "Odśwież", `adm-confirm-dialog`), `unsavedChangesGuard` +
  `warnBeforeUnload`, and **one** config-driven side-panel editor `adm-item-editor` used by technologies,
  expertise areas, services and FAQ instead of four separate panels. Sortable lists use CDK drag and drop plus
  ↑/↓ buttons, so ordering also works from the keyboard.
- **Tests:** `e2e/admin/` runs as its own Playwright project after the public one, on one worker (the tests count
  and change shared sample data and put it back). They need the local Supabase stack (`npm run supabase:keys`
  once, then `npm run supabase:start`); seed users are in `supabase/seed.sql`.

## Implementation notes (2026-10-15: language and theme)

- **Panel language:** `adm-preferences` in the top bar and on the login page holds the theme toggle and a button
  with the other language's code (`admin.ui.switchShort`), named in that language (`admin.ui.switchTo`, `lang` set).
  The choice is kept in `localStorage.adminLang` (default Polish) and applied by `adminI18nResolver`/`setAdminLang`:
  texts, `<html lang>`, dates (`adminLocale()`: pl-PL or en-GB) and `AdminSession.language`.
- **API messages:** the admin interceptor sends `Accept-Language` with every admin call; the backend uses it for
  messages under `/api/v1/admin/` only (`LangParamLocaleResolver`), because `lang` there means the content language
  (e.g. the preview). Public endpoints keep following `?lang=`.
- Admin paths stay Polish (`/admin/projekty`) in both languages.
- **Theme:** the same toggle and `ThemeService` as the public site; Material follows through `color-scheme`.
