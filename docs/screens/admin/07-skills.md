# Admin skills (technologies and expertise areas)

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/admin/umiejetnosci?tab=technologie|obszary` | Client only | Admin | `src/app/features/admin/skills/` | A1, A5 |

## Purpose

Manage what the public Skills page shows: technologies (with "how I use it" descriptions) and expertise areas (with their technologies and evidence projects).

## Layout

Two tabs.

**Technologie**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Umiejętności   [Technologie] [Obszary kompetencji]     [+ Technologia]   │
│ Kategoria: [Wszystkie ▾]   ☐ tylko widoczne na stronie                   │
├──────────────────────────────────────────────────────────────────────────┤
│ ⋮⋮ │ Nazwa        │ Kategoria       │ Na stronie │ Od   │ Projekty │ EN       │
│ ⋮⋮ │ Spring Boot  │ Backend         │   [✓]      │ 2017 │ 4        │ kompletne│
│ ⋮⋮ │ Kafka        │ Backend         │   [✓]      │ 2021 │ 1        │ brak     │
└──────────────────────────────────────────────────────────────────────────┘
Row click → dialog: Nazwa, Adres (slug), Kategoria, Od roku, Widoczna na stronie,
                    [Polski | English] Opis „jak używam” (max 200 znaków)
```

**Obszary kompetencji**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⋮⋮ Projektowanie API          4 technologie · 2 projekty · EN kompletne  │
│ ⋮⋮ Wydajność baz danych       2 technologie · 3 projekty · EN brak       │
│                                                       [+ Obszar]         │
└──────────────────────────────────────────────────────────────────────────┘
Click → side panel editor: [Polski | English] Tytuł, Podsumowanie, Opis (markdown)
                           Technologie [chips], Projekty potwierdzające [chips]
```

## Content and translation keys (Polish only)

`admin.skills.title` Umiejętności · `.tab.technologies` Technologie · `.tab.areas` Obszary kompetencji · `.newTechnology` Technologia · `.newArea` Obszar · `.col.name` Nazwa · `.col.category` Kategoria · `.col.visible` Na stronie · `.col.since` Od · `.col.projects` Projekty · `.description` Opis „jak używam” · `.visible` Widoczna na stronie Umiejętności · `.areaProjects` Projekty potwierdzające · `.deleteTechInUse` Tej technologii używa {count} projektów. Usuń ją najpierw z projektów albo ukryj ją na stronie. · `.deleteConfirm` Usunąć „{name}”? · category labels reuse `skills.category.*`.

## Data

| Call | Purpose |
|---|---|
| `GET /api/v1/admin/technologies` | `{ id, version, slug, name, category, showOnSkillsPage, sinceYear, sortOrder, projectCount, translations: { pl: { description }, en: { description } | null } }[]` |
| `POST/PUT/DELETE /api/v1/admin/technologies[/{id}]` | CRUD; delete returns 409 when used by projects |
| `PUT /api/v1/admin/technologies/order` | Order within category |
| `GET /api/v1/admin/expertise-areas` | `{ id, version, sortOrder, technologyIds, projectIds, translations: { pl: {title, summary, descriptionMd}, en: … | null } }[]` |
| `POST/PUT/DELETE /api/v1/admin/expertise-areas[/{id}]`, `PUT …/order` | CRUD and order |

## Behaviour and states

- Visibility toggle and category edits save inline.
- Reordering technologies only within a selected category.
- An area's project picker lists all projects; unpublished ones show a "Szkic" chip and won't appear publicly until published.
- Description length limit 200 characters with a counter.

## Technical hints

- Backend feature `skills`: `AdminTechnologiesController`, `AdminExpertiseAreasController`; deleting a technology checks `project_technology` usage.
- Slugs for technologies use the same transliteration helper; unique.

## Acceptance criteria

- [ ] Technologies can be created, edited (both languages), hidden/shown, reordered within a category and deleted when unused.
- [ ] Deleting a used technology is blocked with the usage count.
- [ ] Expertise areas can be created, edited in both languages, linked to technologies and projects, reordered and deleted.
- [ ] The public Skills page reflects changes immediately.

## Out of scope

Importing technologies from GitHub, skill levels.

## Implementation notes (A6, 2026-10-15)

- Technologies and areas are edited in the shared side panel (`adm-item-editor`). The category is also editable
  inline in the table; reordering shows only when one category is selected and "only visible" is off.
