# App shell (public)

| Route | Rendering | Access | Feature folder | Depends on |
|---|---|---|---|---|
| Wraps every public route | SSR | Public | `src/app/layout/` | F2, F3, F5, F6 |

## Purpose

The frame around every public page: header with navigation, the light/dark toggle and the language pill; language hint bar; skip link; footer; the cookie banner. It also owns the behaviour of switching languages and starts analytics (docs/ANALYTICS.md).

## Layout

Desktop (≥ 900 px), the redesign in [docs/redesign/HANDOFF.md](../../redesign/HANDOFF.md):

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [Przejdź do treści]  (visible only on focus)                               │
│ (◎) M. Pośpieszyński   Projekty Umiejętności Usługi O mnie Kontakt  (☀)(EN)│  sticky, 72px, blurred ink
├────────────────────────────────────────────────────────────────────────────┤
│ This site is also available in English.  [Switch to English]  [×]          │  ← conditional
├────────────────────────────────────────────────────────────────────────────┤
│                              <router-outlet>                               │
├────────────────────────────────────────────────────────────────────────────┤
│ Projekty · Umiejętności · Usługi · O mnie · Kontakt ·      GitHub LinkedIn │
│ Jak zbudowana jest ta strona · Polityka prywatności        E-mail          │
│ © 2026 Michał Pośpieszyński                          mpospieszynski.pl     │
└────────────────────────────────────────────────────────────────────────────┘
```

The home link is the graph mark (two joined nodes in a ring) with the owner's name from the profile (admin → Profile),
shortened to the first initial and the rest ("Michał Pośpieszyński" → "M. Pośpieszyński"); `shell.brand` is shown only
until a profile is loaded. The language control is one pill
showing the other language's code; it links to the same page in that language. Before it, a round toggle switches
between the dark and light themes.

Below 900 px: brand on the left; the theme toggle, the language pill and a "Menu" pill on the right. "Menu" opens a full-height
sheet with the five links.

## Content and translation keys

| Key | PL | EN |
|---|---|---|
| `nav.skipToContent` | Przejdź do treści | Skip to content |
| `nav.projects` | Projekty | Projects |
| `nav.skills` | Umiejętności | Skills |
| `nav.services` | Usługi | Services |
| `nav.about` | O mnie | About |
| `nav.contact` | Kontakt | Contact |
| `nav.menu` / `nav.closeMenu` | Menu / Zamknij menu | Menu / Close menu |
| `nav.languageShort.pl` / `.en` | PL / EN | PL / EN |
| `nav.switchTo.pl` / `.en` | Przełącz na polski / Switch to English | Przełącz na polski / Switch to English |
| `shell.brand` (fallback) | M. Pośpieszyński | M. Pośpieszyński |
| `nav.theme.toLight` / `.toDark` | Włącz jasny motyw / Włącz ciemny motyw | Switch to the light theme / Switch to the dark theme |
| `shell.langHint.text` | This site is also available in English. | – (only shown on PL pages) |
| `shell.langHint.action` | Switch to English | – |
| `shell.langHint.dismiss` | Close | – |
| `footer.howBuilt` | Jak zbudowana jest ta strona | How this site is built |
| `footer.privacy` | Polityka prywatności | Privacy policy |
| `footer.cookieSettings` | Ustawienia cookies | Cookie settings |
| `consent.label` | Zgoda na pliki cookies | Cookie consent |
| `consent.text` | Za Twoją zgodą używam plików cookies, żeby zobaczyć, jak korzystasz ze strony: mapy kliknięć i nagrania wizyt, bez tego, co wpisujesz. Bez zgody liczę tylko anonimowe odsłony, bez cookies. | With your consent I use cookies to see how the site is used: click heatmaps and visit recordings, never what you type. Without consent I only count anonymous page views, with no cookies. |
| `consent.policy` | Polityka prywatności | Privacy policy |
| `consent.accept` / `consent.reject` | Akceptuję / Odrzucam | Accept / Reject |
| `consent.current.accepted` / `.rejected` | Obecnie: zgoda wyrażona. / Obecnie: bez zgody. | Currently: consent given. / Currently: no consent. |
| `footer.copyright` | © {year} {name} | © {year} {name} |
| `footer.domain` | mpospieszynski.pl | mpospieszynski.pl |

The language hint is deliberately written in English on Polish pages: it addresses visitors whose browser does not prefer Polish, for whom English is the better choice.

## Data

`GET /api/v1/public/profile?lang=` (loaded once by a shell resolver at the root route, cached for the session):

```ts
interface ProfileResponse {
  lang: 'pl' | 'en';
  fullName: string;
  headline: string;
  introMd: string;
  aboutMd: string;
  approachMd: string;
  locationLabel: string | null;
  availability: { status: 'OPEN' | 'LIMITED' | 'CLOSED'; from: string | null; visible: boolean };
  socialLinks: { github?: string; linkedin?: string; email?: string; [k: string]: string | undefined };
  portrait: MediaRef | null;
  siteProject: { slug: string; lang: 'pl' | 'en' } | null;   // for "How this site is built"
}
interface MediaRef { url: string; alt: string; width: number; height: number }
```

## Behaviour and states

- **Active tab:** `routerLinkActive` with `aria-current="page"`; case-study pages mark "Projekty" as active.
- **Language switcher:**
  - Static pages: switch through the route table (`projects` ↔ `projekty`), keeping query parameters.
  - Pages with content slugs (case study): the page publishes its alternates through `SeoService`; the switcher reads them from the same signal. Missing alternate → link to the other language's projects list with `?notTranslated=1`, which the list page turns into a note.
  - Rendered as one pill linking to the other language, labelled with its code (`nav.languageShort`), with `aria-label` `nav.switchTo.<lang>`, `lang` and `hreflang`.
- **Theme:** dark or light (DIRECTION.md, Tokens). The toggle (`ui-theme-toggle`, `ThemeService`) stores `theme` in `localStorage` and sets `data-theme` on `<html>`; without a stored choice the system preference (`prefers-color-scheme`) decides. The inline script in `index.html` applies it before the first paint, so there is no flash; the server renders the dark default and both icons, CSS shows the right one (no hydration mismatch). The button's name says what it does ("Włącz jasny motyw"); it has no `aria-pressed`.
- **Language hint:** shown only on Polish pages, only in the browser (`afterNextRender`), when `navigator.languages[0]` does not start with `pl` and `localStorage.langHintDismissed` is not set. "Switch to English" goes to the equivalent English page; both actions set the dismissal flag.
- **Cookie banner** (only when `POSTHOG_KEY` is configured; docs/ANALYTICS.md §4): browser-only after hydration, a panel at the bottom (full width on phones, a 440 px card at the bottom left from 768 px), not a modal. Shown while the visitor has not decided (`ConsentService`, `localStorage.consent`, asked again after 12 months); two equal ghost pills, Accept and Reject; a link to the privacy policy. "Cookie settings" in the footer reopens it with the current choice. A Global Privacy Control signal counts as Reject. Never on `/admin`.
- **Remembered language:** the language pill and "Switch to English" store the chosen language as `localStorage.lang` (`LanguageService.rememberLang`). With `en` stored, a script in `index.html` sends the bare `/` (query and fragment kept) to `/en` before the first paint; deep links stay as they are, and choosing PL with the pill makes `/` Polish again. No redirect by browser language or country (ARCHITECTURE.md §7).
- **Menu sheet:** native `<dialog>` with `showModal()`, closes on `Esc`, on link click and on backdrop click; focus returns to the Menu button.
- **Scroll:** scroll to top on navigation, restore on back (`withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })`).

## SEO

The shell itself sets nothing page-specific. It renders the `<link rel="alternate">` tags managed by `SeoService` and `JSON-LD` `WebSite` once.

## Technical hints

- `layout/public-layout.component.ts` is the parent route component for both language trees; children come from `buildLocalizedRoutes()`.
- `LanguageService.lang` is a signal computed from the deepest active route's `data.lang`; `TranslocoService.setActiveLang()` runs in an effect when it changes, before rendering children (set it in a resolver of the parent route so SSR has the right language from the first render).
- Profile resolver key includes `lang`; reuse the result for the footer and other pages via a `ProfileStore` signal.
- Footer "How this site is built" uses `siteProject.slug`; hide the link when `siteProject` is null.
- The skip link targets `<main id="content" tabindex="-1">`.

## Accessibility

- Header `nav` has `aria-label` from `nav.main` ("Główna nawigacja" / "Main navigation"); footer nav has its own label.
- The language pill: `lang` and `hreflang` matching its target, and an `aria-label` naming the language in full.

## Acceptance criteria

- [ ] All five tabs and the logo link work in both languages and mark the active page.
- [ ] On `/projekty/<slug>` with an English version, the switcher links to `/en/projects/<english-slug>`; without one, it links to `/en/projects?notTranslated=1`.
- [ ] Switching language keeps query parameters on list pages.
- [ ] A first visit follows the system colour scheme; the toggle switches dark/light, the choice persists across reloads with no flash of the other theme, and both themes pass axe and `npm run check:contrast`.
- [ ] The English hint appears only on Polish pages for browsers that do not prefer Polish, and never again after dismissing or switching.
- [ ] After choosing English (pill or hint), `/` opens `/en` with the query kept; deep Polish links stay Polish; choosing PL makes `/` Polish again; without a choice `/` is Polish.
- [ ] With analytics configured, the cookie banner asks a first-time visitor, closes after Accept or Reject, stays closed on later visits, and reopens from the footer showing the current choice; without `POSTHOG_KEY` there is no banner and no footer link.
- [ ] The menu sheet works with keyboard only and returns focus to the Menu button.
- [ ] `<html lang>` is `pl` on Polish pages and `en` on English pages in the SSR output.
- [ ] Five Polish tab labels fit on one line at 900 px and wider; below that they move into the Menu sheet and the language pill stays visible.

## Out of scope

Admin layout (see [admin shell](../admin/01-admin-shell.md)). Search.

## Implementation notes (S1, 2026-10-15)

- Home keeps the regular header bar. Putting the header inside the hero card would duplicate the brand and hide the
  PL|EN switcher and the theme toggle; the card keeps the stripe, headline, intro and links instead.
- The skip link focuses `<main>` with a click handler: with `<base href="/">` a bare `#content` would lead to `/`.
  The same applies to every in-page link (the privacy table of contents uses router links with a `fragment`).
- `SeoService.alternates` is a signal cleared on each navigation; the switcher uses it only on pages with route
  parameters (case studies). Static pages switch through the route table and keep their query string.
- The footer's social labels use `common.social.*`; the `nav` breakpoint in `_breakpoints.scss` (900px since the redesign) hides the tabs.

## Implementation notes (redesign, 2026-10-15)

- Header, footer and breakpoint follow the handoff: sticky 72px bar with a backdrop blur, the graph mark and
  `shell.brand`, page links from 900px, the language pill, the Menu pill below 900px. The theme toggle, the
  light theme and the footer stripe were removed. On Home the in-page sections are reached through the hero links,
  not the header (the header keeps the five pages).
