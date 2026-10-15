# Skills

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/umiejetnosci` (PL), `/en/skills` (EN) | SSR | Public | `src/app/features/skills/` | S1, S2 |

## Purpose

Advertise the skillset with evidence. Expertise areas explain what you are good at and link to projects that prove it; technologies are grouped by category, each with a short "how I use it" and a link to the projects that use it.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Umiejętności                                                            │
│  Lead: one or two sentences (i18n).                                      │
│                                                                          │
│  Obszary kompetencji                                                     │
│  ┌──────────────────────────────────┐ ┌──────────────────────────────────┐│
│  │ Projektowanie API                │ │ Wydajność baz danych             ││
│  │ summary                          │ │ summary                          ││
│  │ description (markdown, short)    │ │ …                                ││
│  │ [Spring Boot] [OpenAPI] [JPA]    │ │ [PostgreSQL] [Flyway]            ││
│  │ Potwierdzone w projektach:       │ │ Potwierdzone w projektach:       ││
│  │ · System zamówień                │ │ · …                              ││
│  │ · Ta strona                      │ │                                  ││
│  └──────────────────────────────────┘ └──────────────────────────────────┘│
│                                                                          │
│  Technologie                                                             │
│  Backend                                                                 │
│   Spring Boot     Główny framework do API i usług.   od 2017   4 projekty │
│   Hibernate/JPA   …                                   od 2017   3 projekty│
│  Dane                                                                    │
│   PostgreSQL      …                                   od 2016   5 projektów│
│  Frontend · Infrastruktura · Narzędzia …                                 │
│                                                                          │
│  Chcesz wykorzystać te umiejętności w swoim projekcie?  [Porozmawiajmy]  │
└──────────────────────────────────────────────────────────────────────────┘
```

Expertise areas: two columns from 960 px, one column below. Technology rows: name, description, "since", project link; on mobile the description wraps under the name.

## Content and translation keys

| Key | PL | EN |
|---|---|---|
| `skills.title` | Umiejętności | Skills |
| `skills.lead` | Każda umiejętność na tej stronie prowadzi do projektów, w których została wykorzystana. | Every skill on this page links to the projects where it was used. |
| `skills.areas.title` | Obszary kompetencji | Areas of expertise |
| `skills.areas.evidence` | Potwierdzone w projektach | Proven in projects |
| `skills.tech.title` | Technologie | Technologies |
| `skills.tech.since` | od {year} | since {year} |
| `skills.tech.projects` | `{count, plural, one {# projekt} few {# projekty} many {# projektów} other {# projektu}}` | `{count, plural, one {# project} other {# projects}}` |
| `skills.category.LANGUAGE` | Języki programowania | Languages |
| `skills.category.BACKEND` | Backend | Backend |
| `skills.category.FRONTEND` | Frontend | Frontend |
| `skills.category.DATA` | Dane | Data |
| `skills.category.INFRASTRUCTURE` | Infrastruktura | Infrastructure |
| `skills.category.TOOLING` | Narzędzia | Tooling |
| `skills.cta.title` | Chcesz wykorzystać te umiejętności w swoim projekcie? | Want these skills on your project? |
| `skills.cta.action` | Porozmawiajmy | Let's talk |

## Data

`GET /api/v1/public/skills?lang=`

```ts
interface SkillsResponse {
  areas: {
    id: string;
    lang: 'pl' | 'en';
    title: string;
    summary: string;
    descriptionMd: string | null;
    technologies: { slug: string; name: string }[];
    projects: { slug: string; lang: 'pl' | 'en'; title: string }[];   // published only
  }[];
  categories: {
    category: 'LANGUAGE' | 'BACKEND' | 'FRONTEND' | 'DATA' | 'INFRASTRUCTURE' | 'TOOLING';
    technologies: {
      slug: string;
      name: string;
      description: string | null;
      descriptionLang: 'pl' | 'en' | null;
      sinceYear: number | null;
      projectCount: number;            // published projects using it
    }[];
  }[];
}
```

Only technologies with `showOnSkillsPage = true`, ordered by `sortOrder` within categories; categories in the enum order; empty categories omitted.

## Behaviour and states

- Technology name links to `/projekty?tech=<slug>` (EN: `/en/projects?tech=<slug>`); with `projectCount = 0` the count and link are hidden.
- Evidence projects link to their case study in the returned `lang`; Polish-only ones on English pages get the "Polish only" label.
- Text returned in Polish on English pages (`lang`/`descriptionLang = 'pl'`) is wrapped in `ui-lang-fallback`.
- No expertise areas → that section hidden; no technologies → that section hidden; both empty → `ui-empty` with a link to projects.

## SEO

- Title `Umiejętności – Imię Nazwisko` / `Skills – Your Name`; description from `skills.lead`.
- Alternates `/umiejetnosci` ↔ `/en/skills`.

## Technical hints

- Backend feature `skills`: `PublicSkillsController` → `SkillsQueryService` building the response with two queries (areas with their links; technologies with counts using a grouped `count(distinct p.id)` over published projects). Cache key `skills:<lang>`.
- Technology rows as a description list (`<dl>`) or a table with `scope="row"` headers; choose the table for screen readers if columns are aligned.
- Avoid any visual "level" indicator (bars, stars, percentages).

## Accessibility

- Each expertise area is an `article` with an `h3`.
- Project count links have full accessible names: "Spring Boot – 4 projekty".

## Acceptance criteria

- [ ] Areas show their technologies and published evidence projects in the page language.
- [ ] Each technology shows its description, "since" year when set, and a correct plural project count linking to filtered projects.
- [ ] Technologies hidden from the skills page don't appear; categories without items don't appear.
- [ ] English page falls back to Polish descriptions with `lang="pl"`.
- [ ] No skill level indicators anywhere.

## Out of scope

Certificates, endorsements, a technology logo wall.

## Implementation notes (S5, 2026-10-15)

- The technology name is the only link (to `/projekty?tech=`), labelled "Spring Boot – 4 projekty"; the count is
  plain text beside it. With no published project, neither link nor count is shown.
- Extra keys: `skills.empty` / `skills.emptyAction` for the both-empty state; `skills.tech.name`, `.description`,
  `.sinceHeader`, `.projectsHeader` for the visually hidden table headers.
