# Home

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/` (PL), `/en` (EN) | SSR (the graph draws in the browser) | Public | `src/app/features/home/` | S1, profile, projects and services endpoints, the contact endpoint (S8) |

## Purpose

A one-page introduction: who I am and what I build, the projects as an explorable graph, what I offer, and a
contact form at the end, so a visitor can go from first look to a message without leaving the page.

## Layout

The redesign in [docs/redesign/HANDOFF.md](../../redesign/HANDOFF.md) (reference prototype in
`docs/redesign/reference/` when present) and [DIRECTION.md](../../../DIRECTION.md). Four sections with in-page
anchors: `#start`, `#uslugi`, `#projekty`, `#kontakt` (the same ids on `/en`).

```
┌──────────────────────────────┬─────────────────────────────────────────────┐
│ Spokojne systemy             │ GRAPH CARD (ink-800, 28px corners, 640px)   │
│ dla ważnych procesów  (h1)   │  hint ……………………… ● Projekt  ○ Technologia    │
│ intro (introMd)              │                                             │
│ [Napisz do mnie] (Zobacz     │     ● projects  ○ technologies  (canvas)    │
│  projekty)                   │                                             │
│ Wybierz projekt na grafie    │ ┌ champagne panel (when one is selected) ┐  │
│ (chip)(chip)(chip)(chip)     │ │ 2024–2025  Title        (×)            │  │
│                              │ │ summary · tags · Szczegóły projektu    │  │
├──────────────────────────────┴─────────────────────────────────────────────┤
│ #uslugi  Czym się zajmuję    │ Service title │ summary   (ruled rows)       │
│ sub · Wszystkie usługi       │ …                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ #projekty (ink-800 band)  Projekty                     Wszystkie projekty  │
│ Name / years │ summary + outline tags │ (Pokaż na grafie)   (ruled rows)   │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ #kontakt  Masz projekt?      │ form card: name, e-mail, message, consent,  │
│ Porozmawiajmy. lead, e-mail  │ Turnstile, [Wyślij wiadomość]               │
└──────────────────────────────┴─────────────────────────────────────────────┘
```

Below 900px: one column (copy, then the graph card at 440px), the header's page links move into the Menu sheet;
the language pill stays visible. Vertical scrolling works over the graph (`touch-action: pan-y`).

## Content and translation keys

| Key | PL | EN |
|---|---|---|
| `home.hero.ctaContact` | Napisz do mnie | Get in touch |
| `home.hero.ctaProjects` | Zobacz projekty | See projects |
| `home.hero.pickLabel` | Wybierz projekt na grafie | Pick a project on the graph |
| `home.graph.hint` | Przeciągnij, by obrócić. Kliknij projekt, by zobaczyć szczegóły. | Drag to rotate. Click a project to see details. |
| `home.graph.aria` | Trójwymiarowy graf projektów połączonych z technologiami… | A 3D graph of projects connected to the technologies… |
| `home.graph.legendProject` / `legendTech` | Projekt / Technologia | Project / Technology |
| `home.panel.close` | Zamknij szczegóły projektu | Close project details |
| `home.panel.details` | Szczegóły projektu | Project details |
| `home.services.title` | Czym się zajmuję | What I do |
| `home.services.sub` | Biorę projekt od pomysłu do działającej aplikacji… | I take a project from idea to a running application… |
| `home.services.all` | Wszystkie usługi | All services |
| `home.projects.title` | Projekty | Projects |
| `home.projects.showOnGraph` | Pokaż na grafie | Show on graph |
| `home.projects.all` | Wszystkie projekty | All projects |

The contact section reuses `contact.heading`, `contact.lead` and the form keys of [08-contact](08-contact.md).
Headline and intro come from the profile (settings), project and service texts from the API.

## Data

Home resolver runs in parallel (`forkJoin`):

| Call | Used for |
|---|---|
| `GET /api/v1/public/profile?lang=` | Headline, intro, socials and the e-mail address (already in `ProfileStore`) |
| `GET /api/v1/public/projects?lang=` | Every published project: chips, graph nodes, the projects band |
| `GET /api/v1/public/services?lang=` | Active services for the services rows |

## Behaviour and states

- **One selection.** The selected project is a single signal shared by the chips (`aria-pressed`), the graph and
  the panel. Pressing a selected chip again or the panel's close button clears it; closing returns focus to the
  chip of that project. Clicking a project node selects it; clicking empty space keeps the selection.
- **Graph** (`features/home/project-graph/`): projects are champagne nodes, technologies emerald rings, edges link
  each project to its technologies (plus dashed links between related technologies). It unfolds on load,
  auto-rotates, can be dragged with inertia, highlights on hover and rotates the selected project to the front.
  Under `prefers-reduced-motion` it neither unfolds nor auto-rotates. It is built in `afterNextRender` (browser
  only) and destroyed with the page: no animation frame or listener survives navigation. The animation loop runs
  only while the card is on screen (`IntersectionObserver`), and the unfold starts the first time it is seen, so
  phones, where the card sits below the first screen, still see it.
- **"Pokaż na grafie"** in the projects band selects that project, scrolls to `#start` (instantly under reduced
  motion) and moves focus to its chip.
- **Panel**: year, title, summary, technology tags and a link to the case study; it rises in (opacity and 12px)
  and is announced through a polite live region.
- **Contact form**: as on `/kontakt` with topic `OTHER` (see 08-contact): validation under each field, focus on
  the first invalid field, success replaces the form, 403/429/5xx messages above the button.
- Without projects, the chips, graph, panel and projects band are hidden; without services, the services section.
- On English pages, Polish-only projects carry `lang="pl"` and link to the Polish case study.

## SEO

- Title: `Imię Nazwisko – <headline>`; description from the intro as plain text.
- JSON-LD `Person` (name, url, sameAs = social links, knowsAbout = technologies on the graph).
- Alternates: `/` ↔ `/en`.

## Accessibility

- One `h1` (the headline). The canvas is `role="img"` with `home.graph.aria`; every choice it offers is also
  available through the chips, which are real buttons with `aria-pressed`.
- The hero CTAs are links to the in-page anchors. "Pokaż na grafie" buttons carry the project's name for screen
  readers.
- Colour pairs in `src/styles/contrast-pairs.json`; axe clean on `/` and `/en`, desktop and phone.

## Acceptance criteria

- [ ] `/` renders in Polish and `/en` in English, both server-side, with headline and intro from settings.
- [ ] Every published project appears as a chip and as a row in the projects band, in `sortOrder`.
- [ ] Choosing a chip selects it (`aria-pressed`), opens the panel with that project and its case-study link;
      choosing it again or closing the panel clears the selection and returns focus to the chip.
- [ ] "Pokaż na grafie" selects that project, brings the hero into view and focuses its chip.
- [ ] Active services appear as rows linking onward to the services page.
- [ ] The contact form validates, sends with topic `OTHER` and shows the success state.
- [ ] On a phone: one column, graph card 440px tall, no horizontal overflow, nav links hidden, language pill visible.
- [ ] No CV, job-seeking or availability messaging on this page.

## Out of scope

Testimonials, blog teasers, newsletter, a WebGL/3D library (the graph is a 2D canvas projection).

## Implementation notes (redesign, 2026-10-15)

- Replaces the S4 split-stage home (trace panel, featured projects, expertise, approach, closing). The trace panel,
  its Server-Timing interceptor and the `server.ts` placeholders were removed; Server-Timing stays on the API.
- The graph is a TypeScript port of the prototype's `graph.js` with its tuned values. The app is zoneless, so the
  handoff's `NgZone.runOutsideAngular` is not needed: the animation loop never touches signals, only the
  selection callback does.
- The panel can cover the selected node on narrow cards (the handoff's optional improvement, not done).
