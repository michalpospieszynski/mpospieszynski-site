# Project detail (case study)

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/projekty/:slug` (PL), `/en/projects/:slug` (EN) | SSR | Public | `src/app/features/projects/` | S2, B5 (media), F6 (`ui-markdown`) |

## Purpose

Tell the story of one project with technical depth: the problem, the solution, the outcome and lessons learned. It is the main proof of skill on the site.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Projekty / Title                                       (breadcrumb)     │
│                                                                          │
│  Title (h1)                                                              │
│  Summary (lead)                                                          │
│                                                                          │
│  Rodzaj: Projekt komercyjny   Rola: …   2024–2025                        │
│  Technologie: [Java] [Spring Boot] [PostgreSQL]   (ui-tech-tag)          │
│  [Zobacz kod] [Wersja demo]                       (only when set)        │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         cover image                                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Problem            (markdown, 68ch)                                     │
│  Rozwiązanie        (markdown with code and diagrams)                    │
│  Rezultat           (markdown)                                           │
│  Wnioski            (markdown, optional)                                 │
│                                                                          │
│  Galeria            (grid of figures, opens a dialog viewer)             │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Potrzebujesz czegoś podobnego?           [Porozmawiajmy o projekcie]│ │
│  └────────────────────────────────────────────────────────────────────┘ │
│  ← Poprzedni: Title                              Następny: Title →       │
└──────────────────────────────────────────────────────────────────────────┘
```

## Content and translation keys

| Key | PL | EN |
|---|---|---|
| `project.breadcrumb` | Projekty | Projects |
| `project.meta.kind` / `.role` / `.period` / `.tech` | Rodzaj / Rola / Okres / Technologie | Type / Role / Period / Technologies |
| `project.links.repo` | Zobacz kod | View code |
| `project.links.live` | Wersja demo | Live demo |
| `project.sections.problem` | Problem | The problem |
| `project.sections.solution` | Rozwiązanie | The solution |
| `project.sections.outcome` | Rezultat | The outcome |
| `project.sections.lessons` | Wnioski | Lessons learned |
| `project.gallery` | Galeria | Gallery |
| `project.cta.title` | Potrzebujesz czegoś podobnego? | Need something similar? |
| `project.cta.action` | Porozmawiajmy o projekcie | Let's talk about your project |
| `project.prev` / `project.next` | Poprzedni projekt / Następny projekt | Previous project / Next project |
| `project.viewer.close` / `.prev` / `.next` | Zamknij / Poprzednie / Następne | Close / Previous / Next |

## Data

`GET /api/v1/public/projects/{slug}?lang=` → 404 if no published project has this slug in this language.

```ts
interface ProjectDetail extends ProjectListItem {
  problemMd: string;
  solutionMd: string;
  outcomeMd: string;
  lessonsMd: string | null;
  seoDescription: string | null;
  repoUrl: string | null;
  liveUrl: string | null;
  gallery: (MediaRef & { caption: string | null })[];
  previous: { slug: string; title: string } | null;   // same language, by sortOrder
  next: { slug: string; title: string } | null;
}
```

## Behaviour and states

- Not found → not-found page with HTTP 404.
- Previous/next wrap only within published projects available in the current language (for EN: translated projects only).
- Gallery viewer: native `<dialog>`; arrow keys move between images; `Esc` closes; images load full size only when opened.
- Contact CTA links to the contact page with `?topic=PROJECT&project=<slug>`.
- Empty optional parts are omitted: lessons, links, gallery.
- Code blocks are highlighted (server-side during SSR via `ui-markdown`); long lines scroll horizontally inside the block.

## SEO

- Title: project title; description: `seoDescription` or `summary`.
- `og:type=article`, `og:image` = cover.
- JSON-LD `CreativeWork` with `name`, `description`, `dateCreated`, `keywords` (technology names), `author` (`Person`).
- Alternates from `translations`; only languages with a slug.

## Technical hints

- Resolver: `getPublicProject({ slug, lang })`; on `ApiError.status === 404` call the not-found helper (sets status, renders not-found).
- Register the alternates with `SeoService` so the switcher in the shell can use them.
- Images: `srcset` is not available from Storage without transforms; upload a reasonably sized cover (max 1600 px wide) and set `width`/`height` to prevent layout shift; `loading="lazy"` for gallery images, `fetchpriority="high"` for the cover.
- The admin preview reuses this page component with data from the admin preview endpoint (see [project editor](../admin/06-project-editor.md)), so keep the component free of route-specific logic: it takes `project` as an input.

## Accessibility

- Breadcrumb as `nav` with `aria-label` ("Ścieżka" / "Breadcrumb").
- Gallery thumbnails are buttons with the image alt text as their accessible name.
- The viewer announces "Obraz 2 z 5" / "Image 2 of 5".

## Acceptance criteria

- [ ] A Polish case study renders server-side with all sections that have content.
- [ ] Its English counterpart renders at the English slug; the switcher links between them.
- [ ] An unknown slug returns HTTP 404 with the not-found page in the right language.
- [ ] Previous/next links stay within the current language's published projects.
- [ ] The gallery viewer works with mouse, touch and keyboard.
- [ ] Code blocks are highlighted in the SSR HTML.
- [ ] The CTA opens the contact form with topic "Projekt" and a reference to this project.

## Out of scope

Comments, likes, view counters, related-articles algorithms.

## Implementation notes (S3, 2026-10-15)

- Previous/next do not wrap: the first project has no "previous", the last no "next".
- Dev sample content: project 101 has a cover and a two-image gallery (SVG diagrams from
  `backend/src/main/resources/dev-media`, copied into local storage by `DevMediaSamples` in the dev profile) and a
  Java code block. `/media/**` responses carry `Content-Security-Policy: default-src 'none'; style-src
  'unsafe-inline'; sandbox` so an uploaded SVG opened directly cannot run script.
