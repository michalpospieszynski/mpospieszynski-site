# Admin media

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/admin/pliki`; also opened as the `adm-media-picker` dialog | Client only | Admin | `src/app/features/admin/media/` | A1, B5 |

## Purpose

Upload and manage images stored in Supabase Storage, with alt text in both languages, and pick them from editors.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Pliki                                   [Szukaj…]   [+ Prześlij pliki]   │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │      Przeciągnij pliki tutaj (JPG, PNG, WebP, maks. 5 MB)            │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                              │
│ │ thumb  │ │ thumb  │ │ thumb  │ │ thumb  │                              │
│ │1600×900│ │ …      │ │        │ │        │                              │
│ │ALT PL✓ │ │ALT PL✗ │ │        │ │        │                              │
│ │ALT EN✗ │ │        │ │        │ │        │                              │
│ │użyty: 2│ │nieużyty│ │        │ │        │                              │
│ └────────┘ └────────┘ └────────┘ └────────┘                              │
└──────────────────────────────────────────────────────────────────────────┘
Click → dialog: large preview, URL (copy), size, dimensions,
        [Polski | English] Tekst alternatywny *, Podpis
        Używany w: Projekt „…” (okładka), Ustawienia (portret)
        [Usuń] (disabled while used)
Picker mode: same grid, single or multiple selection, [Wybierz], upload inside.
```

## Content and translation keys (Polish only)

`admin.media.title` Pliki · `.upload` Prześlij pliki · `.drop` Przeciągnij pliki tutaj (JPG, PNG, WebP, maks. 5 MB) · `.search` Szukaj… · `.alt` Tekst alternatywny · `.altHint` Opisz, co widać na obrazie, w jednym zdaniu. · `.caption` Podpis · `.usedIn` Używany w · `.unused` nieużywany · `.copyUrl` Kopiuj adres · `.copied` Skopiowano · `.select` Wybierz · `.errors.type` Nieobsługiwany typ pliku: {name}. Dozwolone: JPG, PNG, WebP. · `.errors.size` Plik {name} jest za duży (maks. 5 MB). · `.deleteInUse` Plik jest używany i nie można go usunąć. · `.deleteConfirm` Usunąć plik „{name}”?

## Data

| Call | Purpose |
|---|---|
| `GET /api/v1/admin/media?q=&page=` | `{ id, url, originalName, mimeType, width, height, sizeBytes, usageCount, translations: { pl: {altText, caption}, en: … | null } }` page |
| `POST /api/v1/admin/media` (multipart `file`) | Upload → created media |
| `PUT /api/v1/admin/media/{id}` | Alt text and captions |
| `GET /api/v1/admin/media/{id}/usages` | `{ type, id, label, role }[]` |
| `DELETE /api/v1/admin/media/{id}` | 409 when used |

## Behaviour and states

- Multiple uploads in parallel (max 3 at a time) with per-file progress; failures listed per file.
- After upload, the details dialog opens for the first file so alt text gets written right away.
- Picker returns selected media ids; editors show thumbnails and require alt text before publishing.
- SVG is not accepted (script injection risk).

## Technical hints

- Backend: `AdminMediaController` + `MediaService`:
  - Validate size (≤ 5 MB) and sniff the real type from file bytes (not the extension).
  - Read dimensions with `ImageIO` (add TwelveMonkeys `imageio-webp` for WebP).
  - Optionally downscale anything wider than 2000 px.
  - Key `<uuid>.<ext>`; upload via `MediaStorage` with the admin's JWT.
  - Store a `media` row.
- Usage lookup checks project covers, galleries, settings portrait and Markdown fields containing `/media/<key>` (simple `like` query).
- Frontend upload with `HttpClient` `reportProgress: true`.

## Acceptance criteria

- [ ] JPG, PNG and WebP up to 5 MB upload with progress and correct dimensions; other types and larger files are rejected with clear messages.
- [ ] Alt text and captions can be edited in both languages.
- [ ] Usage list is correct, and used files can't be deleted.
- [ ] Picker works inside the project editor and settings, including uploading from the picker.
- [ ] Uploaded images are served from `/media/<key>` with long-lived cache headers.

## Out of scope

Image editing and cropping, folders, non-image files.

## Implementation notes (A3, 2026-10-15)

- Storage key is `<uuid>.<ext>` (no `images/` prefix); the original file name is kept in `media.original_name`
  (migration V3). Images are not downscaled.
- The browser checks type and size first for clear per-file messages; the API checks the real bytes again.
- `/admin/pliki?edit=<id>&lang=en` opens that file's details (dashboard links).
