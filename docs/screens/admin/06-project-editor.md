# Admin project editor

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/admin/projekty/nowy`, `/admin/projekty/:id?lang=pl|en`, preview `/admin/projekty/:id/podglad?lang=` | Client only | Admin | `src/app/features/admin/projects/` | A1, A3 (media picker), S3 (detail component for preview) |

## Purpose

Create and edit a case study in Polish and English, with shared fields edited once, and preview it exactly as it will look.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Projekty / System przetwarzania zamówień   Szkic   Zapisano 14:32        │
│                                     [Podgląd ▾] [Zapisz] [Opublikuj]     │
├──────────────────────────────────────────────────────────────────────────┤
│ [ Polski ● kompletne ] [ English ○ brak tłumaczenia ]  [☐ Pokaż PL obok] │
│ Tytuł *            [System przetwarzania zamówień                ]       │
│ Adres (slug) *     [system-zamowien          ] ↻ z tytułu                │
│ Podsumowanie *     [Nocne przetwarzanie skrócone z 4 h do 25 min.]       │
│ Rola               [Lider zespołu backend                        ]       │
│ Problem *          [markdown editor | podgląd]                           │
│ Rozwiązanie *      [markdown editor | podgląd]                           │
│ Rezultat *         [markdown editor | podgląd]                           │
│ Wnioski            [markdown editor | podgląd]                           │
│ Opis SEO           [                                   ] 0/160           │
├──────────────────────────────────────────────────────────────────────────┤
│ Wspólne dla obu wersji                                                   │
│ Rodzaj *        (•) Komercyjny ( ) Własny ( ) Open source                │
│ Okres *         [04.2024] – [06.2025]  ☐ trwa                            │
│ Technologie     [Spring Boot ×] [PostgreSQL ×] [+ dodaj…]                │
│ Obszary kompetencji [Projektowanie API ×] [+]                            │
│ Okładka *       [miniatura]  [Wybierz z biblioteki]                      │
│ Galeria         [□][□][□] [+ Dodaj]   (drag to reorder)                  │
│ Kod źródłowy    [https://github.com/…]                                   │
│ Wersja demo     [https://…]                                              │
│ Wyróżniony      [✓]                                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

## Content and translation keys (Polish only)

`admin.project.*`: `new` Nowy projekt · `title` Tytuł · `slug` Adres (slug) · `slugFromTitle` Utwórz z tytułu · `summary` Podsumowanie · `role` Rola · `problem` Problem · `solution` Rozwiązanie · `outcome` Rezultat · `lessons` Wnioski · `seo` Opis SEO · `shared` Wspólne dla obu wersji · `kind` Rodzaj · `period` Okres · `ongoing` trwa · `technologies` Technologie · `addTechnology` Dodaj technologię „{name}” · `areas` Obszary kompetencji · `cover` Okładka · `gallery` Galeria · `repo` Kod źródłowy · `live` Wersja demo · `featured` Wyróżniony · `showPlBeside` Pokaż polską wersję obok · `preview` Podgląd · `errors.slugTaken` Ten adres jest już używany. · `errors.enIncomplete` Uzupełnij tytuł, adres i podsumowanie po angielsku albo wyczyść wersję angielską. · `publishMissing` Aby opublikować, uzupełnij: {fields}.

## Data

| Call | Purpose |
|---|---|
| `GET /api/v1/admin/projects/{id}` | Full project (below) |
| `POST /api/v1/admin/projects` | Create (status `DRAFT`) → `{ id, version }` |
| `PUT /api/v1/admin/projects/{id}` | Save (with `version`; 409 on conflict) |
| `GET /api/v1/admin/projects/{id}/preview?lang=` | Same shape as the public `ProjectDetail`, including drafts |
| `GET /api/v1/admin/projects/slug-available?locale=&slug=&excludeId=` | Async slug validator |
| `GET /api/v1/admin/technologies`, `POST /api/v1/admin/technologies` | Picker and inline creation |
| `GET /api/v1/admin/expertise-areas` | Picker |

```ts
interface AdminProject {
  id: string; version: number; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  kind: 'CLIENT' | 'PERSONAL' | 'OPEN_SOURCE'; featured: boolean;
  startedOn: string; finishedOn: string | null;
  repoUrl: string | null; liveUrl: string | null;
  coverMediaId: string | null; galleryMediaIds: string[];
  technologyIds: string[]; expertiseAreaIds: string[];
  translations: {
    pl: ProjectTranslationInput;
    en: ProjectTranslationInput | null;
  };
}
interface ProjectTranslationInput {
  slug: string; title: string; summary: string; role: string | null;
  problemMd: string; solutionMd: string; outcomeMd: string; lessonsMd: string | null;
  seoDescription: string | null;
}
```

## Behaviour and states

- **Validation for saving a draft:** PL title and slug only. **For publishing:** PL title, slug, summary, problem, solution, outcome, kind, start date. The cover and the gallery are optional (a published project can drop every image); a chosen cover needs Polish alt text. **English:** either empty (saved as `null`) or with title, slug and summary; a chosen cover then needs English alt text too.
- **Slug:** generated from the title with Polish transliteration (`ą→a, ć→c, ę→e, ł→l, ń→n, ó→o, ś→s, ź→z, ż→z`, lowercase, non-alphanumerics → `-`) until edited manually; checked for uniqueness per language (debounced async validator). Changing the slug of a published project shows a warning that old links will break.
- **Language tabs:** `?lang=en` opens the English tab; "Pokaż PL obok" shows the Polish text read-only next to each English field.
- **Markdown fields:** `adm-markdown-editor` with tabs "Edycja / Podgląd" (side by side on wide screens); images inserted from the media picker as `![alt](/media/<key>)`.
- **Technologies:** autocomplete; typing an unknown name offers "Dodaj technologię „X”" (creates it with category `TOOLING`, editable later in Skills).
- **Saving:** `Ctrl/Cmd+S` saves; status line shows the last save time; 409 conflict shows the shared message.
- **Preview:** `Podgląd ▾` → PL or EN; opens the preview route, which renders the public project detail component inside a minimal frame with a "Podgląd – niepublikowane" banner.
- **Publish** saves first, then calls publish; errors list the missing fields and focus the first one.

## Technical hints

- Typed reactive forms: one `FormGroup` with `shared`, `pl`, `en` groups. The `en` group is optional: treat "all fields empty" as `null`.
- Dirty tracking for the unsaved-changes guard compares the form value to the last saved snapshot.
- Backend: `AdminProjectsController`, `ProjectCommandService` with a `ProjectValidator` used by both save (draft rules) and publish (publish rules); slug uniqueness also enforced by the DB index (map violation to 409/400 with `errors.slugTaken`). Saving replaces technology, area and gallery links in one transaction and publishes `ContentChangedEvent`.
- The preview endpoint reuses the public mapping code with a flag allowing drafts.

## Acceptance criteria

- [ ] A new project can be saved as a draft with only a Polish title and slug.
- [ ] Publishing enforces the publish rules and lists missing fields.
- [ ] English can be left empty; partially filled English blocks saving with the specific message.
- [ ] Slugs are generated with Polish transliteration and validated for uniqueness per language.
- [ ] Previews in both languages match the public page, including drafts.
- [ ] Concurrent edit in another tab results in the conflict message, not lost data.
- [ ] The public site shows changes right after saving a published project.

## Out of scope

Version history, scheduled publishing, machine translation.

## Implementation notes (A5, 2026-10-15)

- Technologies and areas use an autocomplete field with the chosen items as removable chips below it (a chip grid
  without chips fails axe). Unknown technology names offer "Dodaj technologię „X”".
- The preview route renders outside the admin shell, switches Transloco to the previewed language for the public
  labels and back to Polish on leave.
- After the first save of `/nowy` the editor moves to `/admin/projekty/:id` and keeps the "Zapisano o …" time
  (router navigation state). API field errors are put on the form controls and focus the first one.
