# Admin settings

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/admin/ustawienia#sekcja` | Client only | Admin | `src/app/features/admin/settings/` | A1, A3 |

## Purpose

Edit the site-wide content and options: name, headline, intro, about and approach texts, availability, links, portrait, the "How this site is built" project, and the contact auto-reply.

## Layout

One page with sections and a sticky save bar; language tabs inside each section that has translatable fields.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Ustawienia                                     Zapisano 14:32  [Zapisz]  │
├──────────────────────────────────────────────────────────────────────────┤
│ Podstawowe                                                               │
│  Imię i nazwisko *  [                     ]                              │
│  [Polski | English] Lokalizacja  [Pracuję zdalnie z Polski ]             │
├──────────────────────────────────────────────────────────────────────────┤
│ Strona główna i O mnie        [Polski | English]                         │
│  Nagłówek *        [Buduję systemy backendowe, które…   ]                │
│  Wprowadzenie *    [markdown, 2–3 zdania                ]                │
│  O mnie            [markdown                            ]                │
│  Jak pracuję       [markdown                            ]                │
├──────────────────────────────────────────────────────────────────────────┤
│ Dostępność                                                               │
│  Status  (•) Przyjmuję projekty ( ) Ograniczona ( ) Nie przyjmuję        │
│  Od      [11.2026]       Pokazuj na stronie [✓]                          │
├──────────────────────────────────────────────────────────────────────────┤
│ Linki       GitHub [ ]  LinkedIn [ ]  E-mail [ ]                         │
├──────────────────────────────────────────────────────────────────────────┤
│ Portret     [miniatura] [Wybierz z biblioteki] [Usuń]                    │
├──────────────────────────────────────────────────────────────────────────┤
│ Jak zbudowana jest ta strona   Projekt [Ta strona ▾]                     │
├──────────────────────────────────────────────────────────────────────────┤
│ Autoodpowiedź na formularz     [Polski | English]                        │
│  Temat *  [Dziękuję za wiadomość]                                        │
│  Treść *  [markdown; dostępne pole {name}]                               │
│  [Wyślij testową wiadomość na mój adres]                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

## Content and translation keys (Polish only)

`admin.settings.title` Ustawienia · `.basic` Podstawowe · `.fullName` Imię i nazwisko · `.location` Lokalizacja · `.content` Strona główna i O mnie · `.headline` Nagłówek · `.intro` Wprowadzenie · `.about` O mnie · `.approach` Jak pracuję · `.availability` Dostępność · `.availability.OPEN` Przyjmuję projekty · `.LIMITED` Ograniczona · `.CLOSED` Nie przyjmuję · `.from` Od · `.visible` Pokazuj na stronie · `.links` Linki · `.portrait` Portret · `.siteProject` Jak zbudowana jest ta strona · `.autoreply` Autoodpowiedź na formularz · `.subject` Temat · `.body` Treść · `.placeholderHint` Możesz użyć {name} – zostanie zastąpione imieniem nadawcy. · `.testMail` Wyślij testową wiadomość na mój adres · `.testSent` Wysłano wiadomość testową.

## Data

| Call | Purpose |
|---|---|
| `GET /api/v1/admin/profile` | All settings with `translations: { pl, en | null }`, `version` |
| `PUT /api/v1/admin/profile` | Save (409 on conflict) |
| `POST /api/v1/admin/profile/test-autoreply?locale=` | Sends the auto-reply to `MAIL_OWNER_TO` |

```ts
interface AdminProfile {
  version: number;
  fullName: string;
  availability: { status: 'OPEN' | 'LIMITED' | 'CLOSED'; from: string | null; visible: boolean };
  socialLinks: { github: string | null; linkedin: string | null; email: string | null };
  portraitMediaId: string | null;
  siteProjectId: string | null;
  translations: {
    pl: ProfileTranslationInput;
    en: ProfileTranslationInput | null;
  };
}
interface ProfileTranslationInput {
  headline: string; introMd: string; aboutMd: string | null; approachMd: string | null;
  locationLabel: string | null; autoreplySubject: string; autoreplyBodyMd: string;
}
```

## Behaviour and states

- Required: full name; Polish headline, intro, auto-reply subject and body. English optional as a whole; if any English field is filled, the English headline, intro and auto-reply become required (so English visitors never get a Polish auto-reply).
- Section anchors (`#dostepnosc`) let the dashboard link straight to availability.
- Headline counter: warn above 90 characters (it is the display heading).
- URLs validated as `https://`; email validated.

## Technical hints

- Backend feature `profile`: `AdminProfileController`, single-row `site_settings` (id = 1) with translations; `ContentChangedEvent` on save.
- Auto-reply falls back to Polish only if no English translation exists (enforced by the rule above).
- The test mail uses the same template code as the real auto-reply.

## Acceptance criteria

- [ ] All fields load, validate and save; the public pages reflect them immediately in both languages.
- [ ] Partially filled English blocks saving with a specific message.
- [ ] Availability changes appear on Services and Contact (and disappear when hidden).
- [ ] The test auto-reply arrives in the chosen language with `{name}` replaced.

## Out of scope

Theme or colour settings, multiple profiles.

## Implementation notes (A8, 2026-10-15)

- One language choice drives every translatable section; `?lang=en` opens English.
- "Wyślij testową wiadomość" sends in the selected language and saves first when something changed.
- The admin scrolls inside its own content area, so `#section` fragments are scrolled to by the page itself.
