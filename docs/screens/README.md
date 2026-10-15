# Screen specifications

One file per screen. Each file contains everything needed to implement that screen: route, purpose, layout, content and translation keys, data and API contract, states, SEO, technical hints, accessibility notes, acceptance criteria and what is out of scope.

Shared rules are **not** repeated here:

- Coding rules → [`../CONVENTIONS.md`](../CONVENTIONS.md)
- Design tokens, shared components, copy rules → [`../UI-UX-DESIGN.md`](../UI-UX-DESIGN.md)
- Data model, API overview, security → [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- Build order and foundation tasks → [`../IMPLEMENTATION-PLAN.md`](../IMPLEMENTATION-PLAN.md)

## Prompt template

> Implement `docs/screens/<area>/<file>.md`. Follow `docs/CONVENTIONS.md`. Include the backend work listed in the spec if it isn't implemented yet, tests for every acceptance criterion, and PL/EN translation keys.

## Public screens (SSR, Polish at `/`, English at `/en`)

| # | Screen | Route PL | Route EN | Task |
|---|---|---|---|---|
| 01 | [App shell](public/01-app-shell.md) | all | all | S1 |
| 02 | [Home](public/02-home.md) | `/` | `/en` | S4 |
| 03 | [Projects list](public/03-projects-list.md) | `/projekty` | `/en/projects` | S2 |
| 04 | [Project detail](public/04-project-detail.md) | `/projekty/:slug` | `/en/projects/:slug` | S3 |
| 05 | [Skills](public/05-skills.md) | `/umiejetnosci` | `/en/skills` | S5 |
| 06 | [Services](public/06-services.md) | `/uslugi` | `/en/services` | S6 |
| 07 | [About](public/07-about.md) | `/o-mnie` | `/en/about` | S7 |
| 08 | [Contact](public/08-contact.md) | `/kontakt` | `/en/contact` | S8 |
| 09 | [Privacy](public/09-privacy.md) | `/polityka-prywatnosci` | `/en/privacy` | S9 |
| 10 | [Not found](public/10-not-found.md) | `**` | `/en/**` | S10 |

## Admin screens (client-side only, Polish UI, `/admin`)

| # | Screen | Route | Task |
|---|---|---|---|
| 01 | [Admin shell](admin/01-admin-shell.md) | `/admin/**` | A1 |
| 02 | [Login](admin/02-login.md) | `/admin/logowanie` | A2 |
| 03 | [Dashboard](admin/03-dashboard.md) | `/admin` | A10 |
| 04 | [Messages](admin/04-messages.md) | `/admin/wiadomosci` | A9 |
| 05 | [Projects list](admin/05-projects-list.md) | `/admin/projekty` | A4 |
| 06 | [Project editor](admin/06-project-editor.md) | `/admin/projekty/nowy`, `/admin/projekty/:id` | A5 |
| 07 | [Skills](admin/07-skills.md) | `/admin/umiejetnosci` | A6 |
| 08 | [Services and FAQ](admin/08-services-faq.md) | `/admin/uslugi` | A7 |
| 09 | [Media](admin/09-media.md) | `/admin/pliki` | A3 |
| 10 | [Settings](admin/10-settings.md) | `/admin/ustawienia` | A8 |

## Spec template

New screens use this structure:

```
# <Screen name>
| Route | Rendering | Access | Feature folder | Depends on |
## Purpose
## Layout
## Content and translation keys
## Data
## Behaviour and states
## SEO                      (public only)
## Technical hints
## Accessibility            (screen-specific only)
## Acceptance criteria
## Out of scope
```
