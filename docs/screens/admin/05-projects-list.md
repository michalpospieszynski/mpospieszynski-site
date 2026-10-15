# Admin projects list

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/admin/projekty?status=` | Client only | Admin | `src/app/features/admin/projects/` | A1 |

## Purpose

See all projects with their status and translation state, reorder them, and jump into editing.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Projekty                                               [+ Nowy projekt]  │
│ [Wszystkie] [Opublikowane] [Szkice] [Archiwum]                           │
├──────────────────────────────────────────────────────────────────────────┤
│ ⋮⋮ │ Tytuł (PL)                 │ Status      │ Wyróżniony │ EN       │ Zmieniono  │ ⋯ │
│ ⋮⋮ │ System przetwarzania zam.  │ Opublikowany│   [✓]      │ kompletne│ wczoraj    │ ⋯ │
│ ⋮⋮ │ Usługa OCR faktur          │ Opublikowany│   [ ]      │ brak     │ 3 dni temu │ ⋯ │
│ ⋮⋮ │ Nowy projekt               │ Szkic       │   [ ]      │ brak     │ dziś       │ ⋯ │
└──────────────────────────────────────────────────────────────────────────┘
⋯ menu: Edytuj · Podgląd PL · Podgląd EN · Opublikuj/Wycofaj · Archiwizuj · Usuń
```

## Content and translation keys (Polish only)

`admin.projects.title` Projekty · `.new` Nowy projekt · `.filter.*` Wszystkie / Opublikowane / Szkice / Archiwum · `.col.title` Tytuł · `.col.status` Status · `.col.featured` Wyróżniony · `.col.en` EN · `.col.updated` Zmieniono · `.status.DRAFT` Szkic · `.status.PUBLISHED` Opublikowany · `.status.ARCHIVED` Zarchiwizowany · `.preview` Podgląd · `.archive` Archiwizuj · `.deleteConfirm` Usunąć projekt „{title}”? Tej operacji nie można cofnąć. · `.empty` Nie masz jeszcze projektów. Dodaj pierwszy, aby pokazać go na stronie. · `.orderSaved` Kolejność zapisana.

## Data

| Call | Purpose |
|---|---|
| `GET /api/v1/admin/projects?status=` | `{ id, version, titlePl, status, featured, enStatus, sortOrder, updatedAt }[]` |
| `PUT /api/v1/admin/projects/order` `{ ids: string[] }` | Persist order |
| `PATCH /api/v1/admin/projects/{id}` `{ featured, version }` | Toggle featured |
| `POST /api/v1/admin/projects/{id}/publish` / `/unpublish` | Publish state (publish validates required fields, 400 with field list) |
| `DELETE /api/v1/admin/projects/{id}` | Delete (also removes gallery links, not the media files) |

## Behaviour and states

- Drag handle reorders; saved immediately with a snackbar; on error the order reverts.
- Reordering is enabled only in the "Wszystkie" view.
- Publish failure lists what's missing ("Brakuje: okładka, tekst alternatywny okładki (PL)").
- Preview opens `/admin/projekty/:id/podglad?lang=pl|en` in a new tab.

## Technical hints

- `mat-table` with `cdkDropList`; `adm-sortable-list` logic shared.
- Backend `AdminProjectsController`; order update in one transaction (`update … set sort_order = case id … end`).

## Acceptance criteria

- [ ] Filters, reorder, featured toggle, publish/unpublish, archive and delete work and reflect immediately on the public site (cache evicted).
- [ ] EN status shows complete / partial / missing correctly.
- [ ] Publishing an incomplete project shows the missing fields.

## Out of scope

Bulk actions, duplicating projects.

## Implementation notes (A4, 2026-10-15)

- Rows can also be moved with ↑/↓ buttons (keyboard). Featured is a checkbox saved immediately with `version`.
- Archived projects return to drafts with "Przywróć jako szkic" in the editor (the unpublish endpoint).
