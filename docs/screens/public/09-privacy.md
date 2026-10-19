# Privacy policy

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| `/polityka-prywatnosci` (PL), `/en/privacy` (EN) | SSR | Public | `src/app/features/legal/` | S1, F6 (`ui-markdown`) |

## Purpose

Explain what personal data the site processes, why, for how long, who processes it, and how to exercise GDPR rights.

## Layout

A single prose page (68ch) with an `h1`, a "last updated" date and headed sections. A table of contents at the top links to each section.

## Content

Stored as Markdown in the repository (legal text changes with code and gets reviewed in pull requests):

```
frontend/src/assets/content/privacy.pl.md
frontend/src/assets/content/privacy.en.md
```

Sections to cover (the owner writes or reviews the final wording):

1. Administrator danych / Data controller – name and contact email.
2. Jakie dane zbieram / What data is collected – contact form fields; hashed IP for spam protection; Cloudflare Web Analytics; PostHog usage statistics by consent state (accepted: cookie, heatmaps, masked recordings; rejected: cookieless counting; undecided: nothing; never the admin).
3. Cel i podstawa prawna / Purpose and legal basis – replying to messages (consent, Art. 6(1)(a) GDPR; steps before a contract, Art. 6(1)(b)); analytics with cookies (consent, Art. 6(1)(a)); cookieless counting (legitimate interest, Art. 6(1)(f)).
4. Okres przechowywania / Retention – contact messages deleted after 12 months; PostHog recordings 30 days, statistics 12 months.
5. Odbiorcy danych / Processors – Supabase (database, authentication, storage; region), Cloudflare (delivery, security, bot protection, cookieless analytics), PostHog (usage analytics; EU hosting, SCCs and the Data Privacy Framework), the SMTP provider.
6. Prawa osoby / Your rights – access, rectification, erasure, restriction, objection, withdrawal of consent, complaint to the supervisory authority (in Poland: Prezes UODO).
7. Pliki cookies / Cookies – none for advertising; `localStorage` for the theme, the chosen language, the language-hint dismissal and the cookie-banner answer; PostHog's `ph_…_posthog` cookie only after Accept; how to change the choice (footer "Cookie settings") and that GPC counts as a rejection; Turnstile may set what it needs for bot protection on the contact page.
8. Zmiany / Changes – date of last update.

| Key | PL | EN |
|---|---|---|
| `privacy.title` | Polityka prywatności | Privacy policy |
| `privacy.updated` | Ostatnia aktualizacja: {date} | Last updated: {date} |
| `privacy.toc` | Spis treści | Contents |

## Data

Bundled Markdown imported at build time (`?raw` import or a JSON wrapper), so SSR needs no HTTP call. The `updated` date is front matter in the file.

## SEO

- Title `Polityka prywatności – Imię Nazwisko` / `Privacy policy – Your Name`; indexable, with alternates between both versions.

## Technical hints

- Generate the table of contents from `h2` headings rendered by `ui-markdown` (add `id`s with a slugger that handles Polish characters).

## Acceptance criteria

- [ ] Both language versions render server-side with a working table of contents.
- [ ] The contact form's privacy link opens the page in the same language.
- [ ] All processors named in the architecture are listed.

## Out of scope

Terms of service. (The cookie banner is part of the app shell, docs/ANALYTICS.md.)

## Implementation notes (S9, 2026-10-15)

- Bundled with esbuild's text loader (`angular.json`: `"loader": { ".md": "text" }`), front matter `updated:`.
- The texts are a draft for the owner to review; the Supabase region and the VPS provider are written as "in the
  European Union" until they are chosen.
