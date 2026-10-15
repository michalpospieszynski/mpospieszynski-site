# Not found

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `**` (PL), `en/**` (EN); also rendered by resolvers on API 404 | SSR | Public | `src/app/features/not-found/` | S1 |

## Purpose

Tell visitors the page doesn't exist and send them somewhere useful, with a real 404 status for crawlers.

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│                 Ta strona nie istnieje                       │
│   Mogła zostać przeniesiona podczas aktualizacji serwisu.    │
│          [Strona główna]   [Zobacz projekty]                 │
└──────────────────────────────────────────────────────────────┘
```

The only centred layout on the site.

## Content and translation keys

| Key | PL | EN |
|---|---|---|
| `notFound.title` | Ta strona nie istnieje | This page doesn't exist |
| `notFound.text` | Mogła zostać przeniesiona podczas aktualizacji serwisu. | It may have moved when the site was updated. |
| `notFound.home` | Strona główna | Home |
| `notFound.projects` | Zobacz projekty | See projects |

## Behaviour and states

- Language follows the URL: anything under `/en/` gets English, everything else Polish.
- Resolvers that receive an API 404 render this page **without changing the URL** (navigate with `skipLocationChange: true`), so the visitor can fix a typo.

## SEO

- HTTP status 404; `<meta name="robots" content="noindex">`; no alternates.

## Technical hints

- `NotFoundService.show(lang)`: on the server, sets the status through Angular's SSR response init token (`RESPONSE_INIT` in current Angular SSR APIs) to 404; then navigates to the not-found route with `skipLocationChange`.
- The wildcard routes are the last entries in each language tree.

## Acceptance criteria

- [ ] `/nie-ma-takiej-strony` returns HTTP 404 with Polish text; `/en/missing` returns 404 with English text.
- [ ] `/projekty/unknown-slug` returns 404 and keeps the URL.
- [ ] The page has `noindex` and no `hreflang` links.

## Out of scope

Search suggestions.

## Implementation notes (S10, 2026-10-15)

- `orNotFound(lang)` / `notFoundRedirect(lang)` in `core/http/not-found.ts` return a `RedirectCommand` to `/404` or
  `/en/404` with `skipLocationChange`; that path falls through to the `**` route. The page sets the status itself
  (`RESPONSE_INIT`), so both routes answer 404.
