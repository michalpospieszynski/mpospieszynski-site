# Projects list

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/projekty` (PL), `/en/projects` (EN), query `?kind=&tech=&notTranslated=` | SSR | Public | `src/app/features/projects/` | S1, B2–B4 |

## Purpose

Show all published work and let visitors narrow it by kind and technology. Featured projects get more visual weight.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Projekty                                                                │
│  Projekty komercyjne, własne i open source.                              │
│                                                                          │
│  [Wszystkie] [Komercyjne] [Własne] [Open source]    Technologia: [▾]     │
│                                                                          │
│  (no filters)                                                            │
│  ┌────────────────────┐  Title                                    2025   │
│  │    cover           │  Kind · Role                                     │
│  │                    │  Outcome sentence                                │
│  └────────────────────┘  tags                         [Polska wersja]    │
│  … featured rows …                                                       │
│  ───────────────────────────────────────────────────────────────────── │
│  Pozostałe projekty                                                      │
│  Title                         Kind          tags                 2024   │
│  …                                                                       │
│                                                                          │
│  (filters active)                                                        │
│  Znaleziono 3 projekty        [Wyczyść filtry]                           │
│  compact list of matches                                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

## Content and translation keys

| Key | PL | EN |
|---|---|---|
| `projects.title` | Projekty | Projects |
| `projects.intro` | Projekty komercyjne, własne i open source. | Client work, personal projects and open source. |
| `projects.filter.all` | Wszystkie | All |
| `projects.filter.kind.CLIENT` | Komercyjne | Client |
| `projects.filter.kind.PERSONAL` | Własne | Personal |
| `projects.filter.kind.OPEN_SOURCE` | Open source | Open source |
| `projects.filter.tech` | Technologia | Technology |
| `projects.filter.techAny` | Dowolna | Any |
| `projects.filter.apply` | Pokaż | Show |
| `projects.filter.label` | Filtry projektów | Project filters |
| `projects.others` | Pozostałe projekty | More projects |
| `projects.count` | `{count, plural, one {Znaleziono # projekt} few {Znaleziono # projekty} many {Znaleziono # projektów} other {Znaleziono # projektu}}` | `{count, plural, one {# project found} other {# projects found}}` |
| `projects.clear` | Wyczyść filtry | Clear filters |
| `projects.empty` | Żaden projekt nie pasuje do wybranych filtrów. | No projects match these filters. |
| `projects.polishOnly` | – | Polish only |
| `projects.notTranslatedNote` | Ten projekt jest opisany tylko po polsku. (never shown; the key must exist in both files) | This project is described in Polish only. You can read it in Polish or browse other projects below. |
| `projects.kindLabel.*` | Projekt komercyjny / własny / open source | Client project / Personal project / Open source |

## Data

`GET /api/v1/public/projects?lang=pl|en&kind=CLIENT|PERSONAL|OPEN_SOURCE&tech=<slug>&featured=true|false`

```ts
interface ProjectListItem {
  id: string;
  lang: 'pl' | 'en';                    // language of the returned texts
  slug: string;                          // slug in `lang`
  translations: { pl: string; en: string | null };
  title: string;
  summary: string;                       // one-sentence outcome
  role: string | null;
  kind: 'CLIENT' | 'PERSONAL' | 'OPEN_SOURCE';
  featured: boolean;
  startedOn: string;                     // ISO date
  finishedOn: string | null;
  cover: MediaRef | null;
  technologies: { slug: string; name: string }[];
}
```

`GET /api/v1/public/technologies?lang=` → `{ slug, name, category, projectCount }[]`, only technologies used by at least one published project (for the select).

Ordering: `featured desc, sortOrder asc`.

## Behaviour and states

- Filters are links/`select` bound to query params (`kind`, `tech`, values are language-neutral codes and slugs), so URLs are shareable and the page works without JavaScript (the select is inside a `GET` form with a submit button hidden when JS is active).
- A `tech` value that no published project uses is dropped before the API call (the technologies list is loaded first), so a draft-only technology never yields a silently empty page.
- Without filters: featured projects as `ui-project-feature`, the rest as `ui-project-item` under "Pozostałe projekty". With filters: all matches as `ui-project-item` with the count line.
- Unknown `kind` or `tech` values are ignored (treated as no filter).
- Empty result: `ui-empty` with `projects.empty` and a "Wyczyść filtry" action.
- `?notTranslated=1` on the English page shows `projects.notTranslatedNote` above the list.
- On `/en/projects`, items with `lang === 'pl'` show the "Polish only" label and link to the Polish case study (`/projekty/<pl-slug>`).
- Year shown as `startedOn` year, or `2023–2025` when years differ.

## SEO

- Title: `Projekty – Imię Nazwisko` / `Projects – Your Name`.
- Canonical URL without query params (filtered views are `noindex, follow`).
- Alternates: `/projekty` ↔ `/en/projects`.

## Technical hints

- Resolver reads `queryParamMap` and `route.data.lang`; set `runGuardsAndResolvers: 'paramsOrQueryParamsChange'` on the route.
- Backend: `PublicProjectsController.list()` with a JPA query joining `project_translation` for the requested language with a left join to the Polish translation for fallback; filter by `kind` and technology slug via `exists` subquery. Cache key `lang:kind:tech:featured`.
- Technologies endpoint lives in the `skills` feature; it counts only published projects.

## Accessibility

- The kind filter is a set of links with `aria-current="true"` on the active one, inside a `nav` labelled `projects.filter.label` ("Filtry projektów" / "Project filters").
- The count line is in an `aria-live="polite"` region.

## Acceptance criteria

- [ ] Both languages list published projects only, featured first.
- [ ] `?kind=CLIENT&tech=spring-boot` filters correctly; the URL can be shared and reloaded.
- [ ] Count line uses correct Polish plural forms for 1, 2, 5 and 22 projects.
- [ ] Polish-only projects are labelled and linked to the Polish page on `/en/projects`.
- [ ] `?notTranslated=1` shows the note on the English page.
- [ ] Filtered views have `noindex`; the unfiltered view is indexable with alternates.
- [ ] Filters work without JavaScript.

## Out of scope

Pagination (the number of projects stays small), text search, sorting options.
