# Services

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/uslugi` (PL), `/en/services` (EN) | SSR | Public | `src/app/features/services/` | S1 |

## Purpose

Present what you offer as an independent engineer, what a client gets, and how collaboration works, then make asking easy.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Usługi                                                                  │
│  Lead (i18n)                                ● Wolne terminy od listopada │
│                                                                          │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────┐ │
│  │ Title                │ │ Title                │ │ Title            │ │
│  │ summary              │ │ summary              │ │ summary          │ │
│  │ Co obejmuje:         │ │ …                    │ │ …                │ │
│  │ deliverables (md)    │ │                      │ │                  │ │
│  │ price note           │ │                      │ │                  │ │
│  │ [Zapytaj o tę usługę]│ │                      │ │                  │ │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────┘ │
│  (Service panels expand to show description_md: "Więcej szczegółów")     │
│                                                                          │
│  Jak wygląda współpraca                                                  │
│  1  Rozmowa wstępna                                                      │
│  2  Propozycja                                                           │
│  3  Realizacja                                                           │
│  4  Przekazanie                                                          │
│                                                                          │
│  Najczęstsze pytania                                                     │
│  ▸ question                                                              │
│  ▸ question                                                              │
│                                                                          │
│  Chcesz porozmawiać o swoim projekcie?   [Opisz swój projekt]            │
└──────────────────────────────────────────────────────────────────────────┘
```

Service panels: three columns from 960 px, two from 640 px, one below.

## Content and translation keys

| Key | PL | EN |
|---|---|---|
| `services.title` | Usługi | Services |
| `services.lead` | Pomagam firmom budować i rozwijać niezawodne systemy backendowe. | I help companies build and grow reliable backend systems. |
| `services.includes` | Co obejmuje | What's included |
| `services.more` / `.less` | Więcej szczegółów / Mniej szczegółów | More details / Fewer details |
| `services.ask` | Zapytaj o tę usługę | Ask about this service |
| `services.process.title` | Jak wygląda współpraca | How working together goes |
| `services.process.steps[0..3].title` | Rozmowa wstępna · Propozycja · Realizacja · Przekazanie | Intro call · Proposal · Delivery · Handover |
| `services.process.steps[0..3].text` | Bezpłatna, 30 minut: poznaję problem i cele. · Pisemny zakres, harmonogram i wycena. · Praca w tygodniowych iteracjach z prezentacją postępów. · Dokumentacja, testy, wdrożenie i okres wsparcia. | Free, 30 minutes: I learn about the problem and goals. · Written scope, timeline and quote. · Weekly iterations with progress demos. · Documentation, tests, deployment and a support period. |
| `services.faq.title` | Najczęstsze pytania | Common questions |
| `services.cta.title` | Chcesz porozmawiać o swoim projekcie? | Want to talk about your project? |
| `services.cta.action` | Opisz swój projekt | Describe your project |
| `common.availability.OPEN` | Wolne terminy od {date} / Przyjmuję nowe projekty | Available from {date} / Taking on new projects |
| `common.availability.LIMITED` | Ograniczona dostępność | Limited availability |
| `common.availability.CLOSED` | Obecnie nie przyjmuję nowych projektów | Not taking new projects right now |

Process steps are UI copy (rarely change); services and FAQ come from the database.

## Data

`GET /api/v1/public/services?lang=`

```ts
interface ServicesResponse {
  services: {
    id: string;
    lang: 'pl' | 'en';
    title: string;
    summary: string;
    descriptionMd: string | null;
    deliverablesMd: string | null;
    priceNote: string | null;           // written per language, e.g. "od 12 000 zł" / "from €3,000"
  }[];
  faq: { id: string; lang: 'pl' | 'en'; question: string; answerMd: string }[];
}
```

Availability comes from the profile (`ProfileStore`).

## Behaviour and states

- "Zapytaj o tę usługę" links to contact with `?topic=PROJECT&service=<id>`.
- Availability badge only when `availability.visible`; with `OPEN` and a future `from` date, show the date ("od listopada 2026", `LLLL yyyy` in the page locale).
- "Więcej szczegółów" toggles `descriptionMd` inside the panel (button with `aria-expanded`); hidden when `descriptionMd` is empty.
- No active services → panels section replaced by the CTA only. No FAQ → FAQ section hidden.
- Polish fallback texts wrapped in `ui-lang-fallback`.

## SEO

- Title `Usługi – Imię Nazwisko` / `Services – Your Name`.
- JSON-LD: one `Service` per offering with `provider` (`Person`), `name`, `description`.
- Alternates `/uslugi` ↔ `/en/services`.

## Technical hints

- Feature `services` on the backend: `PublicServicesController.get()` returns both lists in one response (cache `services:<lang>`).
- FAQ items as native `<details>`/`<summary>` rendered server-side.
- The process list is an `<ol>`: it's a real sequence, so numbering is appropriate.

## Acceptance criteria

- [ ] Active services appear in `sortOrder` with deliverables and price notes in the page language.
- [ ] "Zapytaj o tę usługę" preselects that service on the contact form.
- [ ] Availability shows only when enabled in settings, with a localised month name.
- [ ] FAQ works without JavaScript.
- [ ] English page falls back to Polish service texts with `lang="pl"`.

## Out of scope

Online booking, payments, price calculators.

## Implementation notes (S6, 2026-10-15)

- The "from" month is shown for any status except CLOSED while the date is ahead (the sample is LIMITED from
  December 2026). Polish uses the genitive month ("od grudnia 2026") via `monthYear()`.
- Process steps are keys `services.process.steps.1..4.title/text`.
