# About

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/o-mnie` (PL), `/en/about` (EN) | SSR | Public | `src/app/features/about/` | S1 |

## Purpose

Show the person behind the work: background in a few paragraphs, how you work, what you care about. It builds trust for clients. It is not a CV: no employer timeline, no education list, no download.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  O mnie                                                                  │
│                                                                          │
│  ┌──────────┐  aboutMd (markdown, 68ch): who you are, the kind of        │
│  │ portrait │  problems you like, domains you have worked in, where you  │
│  │          │  work from, languages you work in.                         │
│  └──────────┘                                                            │
│                                                                          │
│  Jak pracuję                                                             │
│  approachMd (markdown): principles, e.g. tests first, simple            │
│  architecture, clear communication, documentation.                      │
│                                                                          │
│  Gdzie mnie znaleźć                                                      │
│  GitHub · LinkedIn · E-mail                                              │
│                                                                          │
│  Masz pomysł albo problem do rozwiązania?   [Porozmawiajmy o projekcie]  │
└──────────────────────────────────────────────────────────────────────────┘
```

Portrait floats left from 960 px; above the text on smaller screens.

## Content and translation keys

| Key | PL | EN |
|---|---|---|
| `about.title` | O mnie | About |
| `about.approach` | Jak pracuję | How I work |
| `about.links` | Gdzie mnie znaleźć | Find me online |
| `about.cta.title` | Masz pomysł albo problem do rozwiązania? | Have an idea or a problem to solve? |
| `about.cta.action` | Porozmawiajmy o projekcie | Let's talk about your project |
| `common.social.github` / `.linkedin` / `.email` | GitHub / LinkedIn / E-mail | GitHub / LinkedIn / Email |

## Data

From `ProfileStore` (`GET /api/v1/public/profile?lang=`): `aboutMd`, `approachMd`, `portrait`, `socialLinks`, `fullName`. No extra endpoint.

## Behaviour and states

- `approachMd` empty → section hidden. No portrait → text spans the full prose width.
- Email link uses `mailto:`; the address is rendered as text so it can be copied.
- Polish fallback content wrapped in `ui-lang-fallback`.

## SEO

- Title `O mnie – Imię Nazwisko` / `About – Your Name`; description from the first sentence of `aboutMd`.
- JSON-LD `ProfilePage` with `mainEntity` = `Person` (name, image, sameAs).
- Alternates `/o-mnie` ↔ `/en/about`.

## Technical hints

- Portrait: `width`/`height` set, `loading="eager"`, alt text from media translation.
- Reuse `ui-markdown`; no new backend work.

## Acceptance criteria

- [ ] About and approach texts render from settings in the page language.
- [ ] Portrait, links and CTA render when configured; sections without content are hidden.
- [ ] No CV, employer timeline or job-seeking language on the page.

## Out of scope

Career timeline, education, certificates, downloadable documents.
