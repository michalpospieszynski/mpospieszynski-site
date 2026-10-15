# Design direction: Emerald Ink and the project graph

Adopted 2026-10-15 from the redesign handoff ([docs/redesign/HANDOFF.md](docs/redesign/HANDOFF.md); the reference
prototype is `index.html`, `styles.css`, `graph.js` and `content.js` from the owner's redesign archive). It replaces
the earlier "split stage" direction (walnut and tan, Bodoni Moda and Jost, the trace panel and the stage crossfade).

**This file is the source of truth for the site's look.** It replaces the visual parts of `docs/UI-UX-DESIGN.md`
(§5 Visual direction, §6 colour and typography tokens, §8 Motion). Content, routes, i18n, accessibility and copy rules
in the docs still apply. Take type and colour from here, never from a new draw of the design skill.

Mood: calm, precise, a little nocturnal. Deep green ink, one warm champagne accent, the work drawn as a network.

## The idea

**On this page, the projects and the technologies they share become a graph you can turn in your hand.** The home
hero is that graph: projects are champagne nodes, technologies emerald rings, and choosing a project (on the graph,
in the chips beside it or with "Pokaż na grafie" further down) brings it to the front and opens its card.

## Tokens

All in `src/styles/tokens.scss`; components use the semantic aliases (`--color-*`), never raw hex. The only other
colours are the graph's canvas constants in `features/home/project-graph/project-graph.ts`.

| Raw token | Value | Semantic alias | Use |
|---|---|---|---|
| `--ink-900` | `#0C2620` | `--color-ground` | Page background |
| `--ink-800` | `#0F2E27` | `--color-band`, `--color-raised` | Graph card, projects band, code blocks |
| `--ink-700` | `#12352D` | `--color-raised-2` | Form card, ghost hover |
| `--ink-600` | `#1D4A3F` | `--color-line` | Hairlines between rows, borders |
| `--ink-500` | `#2E6153` | `--color-control` | Pill and tag outlines |
| `--ink-400` | `#538474` | `--color-field` | Form-field borders (3:1, WCAG 1.4.11; not in the prototype) |
| `--emerald-300` | `#7FB8A4` | `--color-ok`, `--color-code-accent` | Tech nodes, positive status, code keywords |
| `--champagne` | `#EADBC0` | `--color-ink`, `--color-stage`, `--color-focus` | Primary text and the only accent |
| `--champagne-hover` | `#F4EAD7` | | Primary button hover |
| `--champagne-line` | `#B9A57E` | | Borders on champagne |
| `--text-body` | `#B7C8BF` | `--color-body` | Long copy |
| `--text-soft` | `#CFE0D7` | `--color-soft` | Form labels, outline tags |
| `--text-muted` | `#9DB3A8` | `--color-muted` | Secondary text |
| `--text-on-champagne(-soft/-muted)` | `#0C2620` / `#1E3A32` / `#3C5A50` | `--color-stage-ink` | Text on champagne |
| `--signal-error` | `#EBA493` | `--color-busy` | Errors and "not taking projects" (always with words) |

Every pair in use is listed in `src/styles/contrast-pairs.json` and checked by `npm run check:contrast`.

Two themes. **Dark** is the design above and the server's default. **Light** keeps the same inks on champagne
paper: ground `--paper-200` #F6F1E7, band `--paper-300` #EDE4D2, form card `--paper-100` #FBF8F2, hairlines
`--paper-400` #DCCFB6, field borders `--paper-600` #857553; text `--ink-900`, body #26443B, muted #4A665C; the accent
surfaces (primary buttons, the project panel, `.cta`, pressed pills) turn `--ink-800` with champagne text; success and
code `#2A5A4C`, errors `#A13D27`. Components use only the semantic `--color-*` names, which `:root[data-theme='light']`
re-points; the graph has a matching canvas palette (`GRAPH_PALETTES`).

A round toggle (sun / moon) in the header and the admin top bar switches them (`ThemeService`, localStorage
`theme`). Until the visitor chooses, the system preference decides. An inline script in `index.html` applies the
choice before the first paint, so there is no flash; without JavaScript the page is dark.

## Typography

- **Syne** (variable, 600–700) for headings and the brand name; tight tracking (−0.01 to −0.025em).
- **Manrope** (variable, 400–700) for everything else, including the labels drawn on the canvas.
- Both are self-hosted through `@fontsource-variable/*` (no Google Fonts request; CSP stays `font-src 'self'`).
- Steps: display `clamp(2.5rem, 4.6vw, 4.4rem)` (h1), head `clamp(2rem, 3.4vw, 3rem)` (h2), lead, body 16–18px with
  line-height 1.6–1.65 and at most ~60ch, small 0.875rem. Headings are balanced and break long words rather than
  widening a 320px page.
- No all-caps labels except the small category headings of the skills table, no emoji, monospace only in code.

## Layout and shape

- Container 1280px with 32px gutters (20px under 480px); 96px between sections (72px under 480px).
- Two-column sections use `.columns` (4fr/8fr) or `.columns--5-7`; one column below 900px (the `md`/`nav`
  breakpoint).
- Structure comes from 1px `--color-line` rules between rows (`.rows` / `.row`), not stacks of cards. The surfaces
  are the graph card, the projects band, the form card and the champagne blocks (the project panel and the closing
  `.cta` of inner pages).
- Corners: pills 999px; graph card and `.cta` 28px; form card 24px; panels, covers and admin cards 20px; tags 14px;
  inputs 12px. Touch targets at least 44px.
- The project panel is the only element with a shadow.

## Components

- Buttons (`ui-button`): `primary` champagne pill, `ink` (ink pill on champagne surfaces), `ghost` outline pill
  (`aria-pressed` turns it champagne), `text` underlined link.
- Tags: outline on ink, solid (ink on champagne) inside the panel.
- The header: sticky 72px bar, translucent ink with blur, the graph mark and `M. Pospieszyński`, page links from
  900px, the language pill (the other language's code), the Menu pill below 900px.
- Inner pages: `.page-head` (h1 and lead), ruled rows, a champagne `.cta` at the end.
- Admin (Angular Material): the same tokens through `src/styles/admin.scss` overrides; pills for tabs and nav links,
  Syne titles, `--color-line` hairlines, `--color-field` outlines.

## Motion

- **Signature:** the graph. Nodes unfold from the centre over 1.6s the first time the card is on screen, then it
  rotates slowly (the loop pauses while the card is scrolled away); drag orbits it
  with inertia, hover brightens a node and its edges, selection eases the node to the front. This is the only
  non-interactive animation: no scroll-reveal or section entrances anywhere.
- **Panel:** the project panel rises in (opacity and 12px, `--dur-panel`, `--ease-out`).
- **Feedback on every control:** pills and buttons scale to 0.97 on press and change background or border on hover;
  links underline; the admin keeps its short page entrance and side-panel slide.
- Transform and opacity only, plus colour transitions on hover.
- **Reduced motion:** no unfold, no auto-rotation, instant selection rotation, no press scale, no panel rise;
  scrolling to the hero is instant. All content is in the server-rendered HTML, so nothing stays hidden if scripts
  fail (only the canvas needs JavaScript, and the chips and rows offer the same choices).

## Deviations from the handoff

- **Language:** the PL/EN control is a link to the other language's URL (`/` ↔ `/en`), not a runtime toggle with
  `localStorage`; the site keeps server-rendered, indexable URLs per language (owner's decision).
- **Pages:** the handoff describes one page. Home follows it; the other public pages and the admin take the same
  tokens and patterns (owner's decision).
- **Contact:** the existing contact API is used (`POST /api/v1/public/contact`) with consent and Turnstile; the
  message minimum stays 20 characters, as the API enforces.
- **Light theme:** added after the handoff at the owner's request (the handoff is dark only).
- **Content:** headline and intro come from the admin settings, projects and services from the API; the prototype's
  placeholder copy is not hard-coded.
- **Zoneless:** the app has no NgZone, so `runOutsideAngular` is not needed; the animation loop touches no signals.
- **Fonts:** self-hosted, not Google Fonts. **Field borders** use `--ink-400` for contrast.
