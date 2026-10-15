# Admin services and FAQ

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/admin/uslugi?tab=uslugi|faq` | Client only | Admin | `src/app/features/admin/services/` | A1 |

## Purpose

Manage service offerings and FAQ shown on the public Services page.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Usługi i FAQ   [Usługi] [FAQ]                                 [+ Dodaj]  │
├──────────────────────────────────────────────────────────────────────────┤
│ ⋮⋮ Backend i API                   Aktywna [✓]   EN kompletne     Edytuj │
│ ⋮⋮ Wdrożenia i hosting             Aktywna [✓]   EN brak          Edytuj │
│ ⋮⋮ Przegląd i modernizacja kodu    Aktywna [ ]   EN częściowe     Edytuj │
└──────────────────────────────────────────────────────────────────────────┘
Editor (side panel):
  [Polski | English]
  Nazwa *  ·  Podsumowanie *  ·  Co obejmuje (markdown)  ·  Szczegóły (markdown)
  Informacja o cenie   (e.g. "od 12 000 zł" / "from €3,000")
  Aktywna [✓]
FAQ editor: [Polski | English] Pytanie *, Odpowiedź (markdown) *
```

## Content and translation keys (Polish only)

`admin.services.title` Usługi i FAQ · `.tab.services` Usługi · `.tab.faq` FAQ · `.add` Dodaj · `.name` Nazwa · `.summary` Podsumowanie · `.deliverables` Co obejmuje · `.description` Szczegóły · `.price` Informacja o cenie · `.priceHint` Wpisz cenę w walucie danej wersji językowej. · `.active` Aktywna · `.question` Pytanie · `.answer` Odpowiedź · `.deleteServiceInUse` Ta usługa jest powiązana z {count} wiadomościami. Zamiast usuwać, wyłącz ją. · `.deleteConfirm` Usunąć „{name}”?

## Data

| Call | Purpose |
|---|---|
| `GET/POST/PUT/DELETE /api/v1/admin/services[/{id}]`, `PUT …/order` | `{ id, version, active, sortOrder, translations: { pl: {title, summary, descriptionMd, deliverablesMd, priceNote}, en: … | null } }` |
| `GET/POST/PUT/DELETE /api/v1/admin/faq[/{id}]`, `PUT …/order` | `{ id, version, sortOrder, translations: { pl: {question, answerMd}, en: … | null } }` |

## Behaviour and states

- Active toggle saves inline; inactive services disappear from the public page and the contact form select.
- Deleting a service linked to messages returns 409 → show `deleteServiceInUse`.
- English is optional per item; partially filled English blocks saving (title and summary / question and answer required together).

## Technical hints

- Same side-panel editor pattern as expertise areas; reuse `adm-lang-tabs` and `adm-markdown-editor`.

## Acceptance criteria

- [ ] Services and FAQ support create, edit in both languages, reorder, activate/deactivate (services) and delete.
- [ ] Deleting a service referenced by messages is blocked with a clear message.
- [ ] Changes appear on `/uslugi` and `/en/services` immediately.

## Out of scope

Price calculators, packages with checkout.

## Implementation notes (A7, 2026-10-15)

- Services and FAQ use the shared side panel (`adm-item-editor`); reorder by drag and drop or ↑/↓.
