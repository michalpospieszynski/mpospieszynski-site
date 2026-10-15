# Admin dashboard

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/admin` | Client only | Admin | `src/app/features/admin/dashboard/` | A1, and data from A4–A9 |

## Purpose

One glance at what needs attention: new messages, drafts and missing English translations.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Pulpit                                                                   │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ ┌──────────────────┐ │
│ │ 3           │ │ 2           │ │ 5               │ │ Wolne terminy    │ │
│ │ nowe        │ │ szkice      │ │ brak tłumaczeń  │ │ od 11.2026       │ │
│ │ wiadomości  │ │ projektów   │ │ EN              │ │ Zmień            │ │
│ └─────────────┘ └─────────────┘ └─────────────────┘ └──────────────────┘ │
│                                                                          │
│ Ostatnie wiadomości                                    Wszystkie         │
│ Anna N. · Projekt · Backend i API · EN · 2 godz. temu                    │
│ …                                                                        │
│                                                                          │
│ Do przetłumaczenia na angielski                                          │
│ Projekt „Usługa OCR faktur”                               Edytuj         │
│ Usługa „Wdrożenia i hosting”                              Edytuj         │
│ Technologia „Kafka” (opis)                                Edytuj         │
└──────────────────────────────────────────────────────────────────────────┘
```

## Content and translation keys (Polish only)

`admin.dashboard.title` Pulpit · `.newMessages` (plural: nowa wiadomość / nowe wiadomości / nowych wiadomości) · `.drafts` (szkic / szkice / szkiców) · `.missingEn` Brak tłumaczeń EN · `.availability` Dostępność · `.change` Zmień · `.recentMessages` Ostatnie wiadomości · `.all` Wszystkie · `.toTranslate` Do przetłumaczenia na angielski · `.edit` Edytuj · `.allDone` Wszystko przetłumaczone. · `.noMessages` Brak nowych wiadomości.

## Data

`GET /api/v1/admin/dashboard`

```ts
interface DashboardResponse {
  newMessages: number;
  draftProjects: number;
  availability: { status: 'OPEN' | 'LIMITED' | 'CLOSED'; from: string | null; visible: boolean };
  recentMessages: { id: string; name: string; topic: string; serviceTitle: string | null;
                    locale: 'pl' | 'en'; status: string; createdAt: string }[];   // 5 newest
  missingTranslations: { type: 'PROJECT' | 'SERVICE' | 'FAQ' | 'TECHNOLOGY' | 'EXPERTISE_AREA'
                               | 'SETTINGS' | 'MEDIA';
                         id: string; label: string; status: 'partial' | 'missing' }[];
}
```

## Behaviour and states

- Cards link to: messages filtered by `NEW`, projects filtered by `DRAFT`, the translation list anchor, settings → availability.
- Each translation item links to its editor with the EN tab open (`?lang=en`).
- Media items count as missing when used on a published page and lacking English alt text.
- Relative times in Polish ("2 godz. temu") via `Intl.RelativeTimeFormat('pl')`.

## Technical hints

- Backend `AdminDashboardController` in `shared` or its own small package, using count queries from each feature through service interfaces (no cross-feature repository access).

## Acceptance criteria

- [ ] Counts match the data in each section.
- [ ] Every missing-translation item opens the right editor on the EN tab.
- [ ] Empty states show "Brak nowych wiadomości" and "Wszystko przetłumaczone."

## Out of scope

Charts and analytics (Cloudflare Web Analytics covers traffic).

## Implementation notes (A10, 2026-10-15)

- Editor links: projects open `/admin/projekty/:id?lang=en`; services, FAQ, technologies, areas and media open
  their list page with `?edit=<id>&lang=en`, which opens that item's editor on the English tab; settings open
  `/admin/ustawienia?lang=en`. The availability card links to `#dostepnosc`.
- The dashboard response also refreshes the sidebar badge.
