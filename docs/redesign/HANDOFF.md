# Frontend redesign handoff — mpospieszynski.pl

Instructions for a coding agent (Claude Code) to bring the existing Angular frontend in line with the approved redesign. Read this whole file before changing code.

## 1. What this is

The redesign was approved as a static prototype. `reference/` holds a working, framework-free version of it. **That prototype is the source of truth for look and behaviour.** Your job is to rebuild it in the project's Angular app, not to copy the vanilla JS wiring.

Open `reference/index.html` directly in a browser to see it running. No build step is needed.

| File | What it is | What it becomes in Angular |
|---|---|---|
| `reference/index.html` | Page markup and section order | Component templates (§5) |
| `reference/styles.css` | Design tokens + all styles | Global tokens file + per-component SCSS |
| `reference/content.js` | All copy (PL/EN), projects, services, tech list | i18n JSON files + a projects data source |
| `reference/graph.js` | `ProjectGraph`: the 3D graph, no dependencies | Ported as-is into a TS class, wrapped by a component |
| `reference/app.js` | DOM wiring for the prototype only | Replaced by Angular bindings; do not port |

## 2. Ground rules

1. Before editing, inspect the existing Angular app: its version, standalone vs NgModule, routing, styling approach (SCSS/CSS), i18n setup, and how it calls the Spring Boot API. Follow the project's existing conventions wherever this document doesn't set a requirement.
2. Do not add a 3D or UI library. The graph is plain Canvas 2D on purpose (small bundle, no WebGL dependency).
3. Do not change copy except to fill placeholders the owner gives you. Text in `[square brackets]` is a placeholder; leave the brackets in place until real content arrives.
4. Polish is the default language. English is a runtime toggle, not a separate build.
5. Keep backend changes out of scope unless asked, except the contact endpoint contract in §8, which you may stub on the frontend.
6. When done, run the acceptance checklist in §10 and report any item that fails.

## 3. Design tokens

Define these once (e.g. `src/styles/_tokens.scss` exposing CSS custom properties on `:root`) and reference them everywhere. Never hard-code these hex values in component styles. The only exception is the graph's canvas colours (§6), which have to be numbers in TS.

| Token | Value | Use |
|---|---|---|
| `--ink-900` | `#0C2620` | Page background (Emerald Ink) |
| `--ink-800` | `#0F2E27` | Graph card, projects band, tech-node fill |
| `--ink-700` | `#12352D` | Raised surfaces (form card), ghost-button hover |
| `--ink-600` | `#1D4A3F` | Hairlines, section borders |
| `--ink-500` | `#2E6153` | Control borders (buttons, inputs, outline tags) |
| `--emerald-300` | `#7FB8A4` | Tech nodes, idle graph edges |
| `--champagne` | `#EADBC0` | Primary text and the **only** accent |
| `--champagne-line` | `#B9A57E` | Borders on champagne surfaces |
| `--text-muted` | `#9DB3A8` | Secondary text (≈7:1 on ink-900) |
| `--text-body` | `#B7C8BF` | Long body copy |
| `--text-soft` | `#CFE0D7` | Form labels, outline tags |
| `--text-on-champagne` | `#0C2620` | Text on champagne fills |

Typography (Google Fonts; both cover Polish diacritics):
- **Syne** 600/700: headings and the brand name. Tight tracking: −0.01em to −0.025em.
- **Manrope** 400–700: everything else, including the labels drawn on the canvas.
- Hero H1: `clamp(2.5rem, 4.6vw, 4.4rem)`, line-height 1.02. Section H2: `clamp(2rem, 3.4vw, 3rem)`. Body: 16–18px, line-height 1.6–1.65, line length ≤ 60ch.

Shape: pill buttons (radius 999px); graph card 28px, detail panel 20px, form card 24px, inputs 12px. Minimum touch target 44px. Layout container: max-width 1280px, 32px side padding (20px under 480px), 96px vertical padding between sections.

Style rules to keep:
- Champagne is the single accent colour. Don't introduce gradients, glows or additional hues.
- Structure comes from 1px `--ink-600` rules between rows, not from stacks of shadowed cards. The detail panel is the only element with a shadow.
- No all-caps labels, emoji or monospace labels.

## 4. Page structure

One route (`/`), sections in this order, with anchor IDs kept as they are because nav links and the "show on graph" link depend on them:

1. **Header** (sticky, 72px, translucent ink with blur). Brand mark on the left. On the right: nav links to Projekty, Usługi, Kontakt, then the PL/EN toggle, which shows the *other* language's code. Nav links hide under 900px; the toggle stays.
2. **Hero** `#start`: two-column grid, 5fr text / 7fr graph.
   - Text column: H1, subtitle, two CTAs (primary "Napisz do mnie" → `#kontakt`, ghost "Zobacz projekty" → `#projekty`), then "Wybierz projekt na grafie" with one toggle button per project (`aria-pressed`).
   - Graph card: min-height 640px (440px on mobile). It holds the canvas, a top overlay (hint text + legend, `pointer-events: none`) and the detail panel.
3. **Services** `#uslugi`: 4fr intro / 8fr list. Each service is a row (title + description) separated by top rules.
4. **Projects** `#projekty`: full-width `--ink-800` band. Each project is a row: name + year | description + outline tech tags | "Pokaż na grafie" ghost link to `#start` that also selects that project.
5. **Contact** `#kontakt`: 5fr intro (title, subtitle, email link) / 7fr form card (name, email, message, "Wyślij wiadomość"). After a successful send, the form is replaced by a `role="status"` confirmation.
6. **Footer**: © line + domain.

Under 900px every two-column grid becomes a single column and project rows stack.

## 5. Angular architecture

Suggested structure. Adapt names to the project's conventions.

```
src/app/
  core/
    i18n/                     ← language state + translations (§7)
    data/projects.service.ts  ← returns Project[] (static for now, API later)
    data/contact.service.ts   ← POST contact form (§8)
  features/home/
    home.page.ts              ← composes the sections below
    hero/hero.component.ts
    project-graph/
      project-graph.component.ts   ← wraps ProjectGraph
      project-graph.ts             ← port of reference/graph.js (§6)
    project-panel/project-panel.component.ts
    services-section/…
    projects-section/…
    contact-section/…
  layout/header/header.component.ts, footer/…
src/styles/_tokens.scss, _base.scss
src/assets/i18n/pl.json, en.json
```

Data model, taken from `content.js`:

```ts
export type TechId = 'java' | 'spring' | 'postgres' | 'angular' | 'supabase' | 'vps' | 'cloudflare';
export interface Project {
  id: string;
  name: Record<Lang, string>;
  year: Record<Lang, string>;
  desc: Record<Lang, string>;
  tech: TechId[];
}
```

Shared state: the selected project ID drives three places at once (hero chips, graph highlight + rotation, detail panel), and the "Pokaż na grafie" links set it too. Keep it in one place: a signal in a small `ProjectSelectionService`, or in `HomePage` passed down. Any of the three can change it.

## 6. The 3D graph (`ProjectGraph`)

Port `reference/graph.js` to `project-graph.ts` as a plain TypeScript class: add types, keep the logic. Its public API:

```ts
new ProjectGraph(canvas, { projects: {id, label, tech}[], tech: Record<TechId,string>,
                           techLinks: [TechId, TechId][], onSelect(id), autoRotate?, rotateSpeed? })
graph.select(id | null)     // highlight + rotate that node to the front
graph.setLabels({id: label}) // call on language change
graph.destroy()             // cancel rAF, ResizeObserver, listeners
```

`ProjectGraphComponent` requirements:
- `@ViewChild` the canvas, then construct the graph in `ngAfterViewInit` **inside `NgZone.runOutsideAngular`** so the animation loop never triggers change detection.
- Call `onSelect` back into the zone (`zone.run`) to update selection state.
- When the selection input changes, call `graph.select()`. When the language changes, call `setLabels()`.
- Call `destroy()` in `ngOnDestroy`.
- If the app uses SSR or prerendering, only construct the graph when `isPlatformBrowser`.
- Canvas: `role="img"` with a translated `aria-label`, and `touch-action: pan-y` so the page still scrolls vertically on phones while horizontal drags rotate the graph.

Behaviour spec. Keep these values; they are tuned.
- Layout: project nodes on a unit sphere and tech nodes on an inner sphere (r = 0.48), placed with Fibonacci-sphere spacing and the Y axis squashed to 0.8. Perspective distance 3.2, scale = 0.36 × min(width, height).
- Load: nodes unfold from the centre over 1.6s with ease-out cubic. This is the page's only non-interactive animation; don't add scroll-reveal or entrance animations elsewhere.
- Idle: slow auto-rotation, which pauses while a node is hovered or selected.
- Drag: orbit (yaw unlimited, pitch clamped to ±1.1 rad), with inertia decaying ×0.94 per frame. Movement under 6px counts as a click.
- Hover: the hovered node and its edges brighten to champagne and everything else dims to 35%. Pointer cursor only on project nodes.
- Select: the node eases to face the viewer, gets a halo ring, and opens the detail panel.
- Draw order: back to front by depth. Size and opacity scale with depth. Tech-to-tech edges are dashed.
- `prefers-reduced-motion`: no auto-rotation, no unfold, selection rotation is instant.

Known improvement (optional, ask first): when a project is selected it lands in the centre, partly behind the panel on short viewports. Consider shifting the projection centre upward while the panel is open.

## 7. i18n

- Move `COPY` and `SERVICES` from `content.js` into `assets/i18n/pl.json` and `en.json`, keeping the same keys (`hero.title`, `form.send`, …).
- The toggle must switch language at runtime. If the project already has a runtime i18n solution, use it. Otherwise add `@ngx-translate/core`. Angular's built-in `@angular/localize` produces a separate build per locale and doesn't fit an in-page toggle.
- On switch: update `<html lang>`, `document.title` (`meta.title`), every translated `aria-label`, and the graph labels. Persist the choice in `localStorage` and restore it on load; the default is `pl`.
- Project text (`name`, `year`, `desc`) stays per-language on the `Project` object, because it will come from the backend later.

## 8. Contact form

- Use a reactive form: `name` required, `email` required + email validator, `message` required with a minimum of 10 characters. Show errors under fields with `aria-describedby`. The send button shows a pending state and is disabled while submitting.
- Assumed endpoint (confirm with the owner before relying on it): `POST /api/contact` with `{ name, email, message, lang }` returning `202` on success. On success, show the confirmation. On failure, keep the form filled and show an inline error saying what happened and to try again or use the email link.
- Add a honeypot field (visually hidden, `tabindex="-1"`, `autocomplete="off"`) for basic spam protection.

## 9. Accessibility and quality floor

- Every interactive element is a real `<button>` or `<a href>`, with a visible `:focus-visible` outline (2px champagne, 3px offset).
- Anything the graph can do is also possible without it: the project chips and the "Pokaż na grafie" links select projects.
- The detail panel close button has a translated `aria-label`. The panel region uses `aria-live="polite"`.
- Contrast stays at or above 4.5:1 for body text. Don't put `--text-muted` on `--ink-700` or lighter.
- Lighthouse targets: Accessibility ≥ 95, Performance ≥ 90 on desktop. Load fonts with `display=swap` and preconnect.

## 10. Acceptance checklist

Compare side by side with `reference/index.html` at 1440px and at 390px wide.

- [ ] Colours, fonts, spacing and section order match the reference. No hard-coded hex values outside the tokens and the graph's TS colour constants.
- [ ] Graph unfolds on load, auto-rotates, can be dragged with inertia, highlights on hover, and selects on click with rotate-to-front.
- [ ] Hero chips, graph and panel stay in sync whichever one changes the selection. "Pokaż na grafie" scrolls to the hero and selects.
- [ ] PL/EN toggle switches all text, aria-labels, the title and graph labels without a reload, and persists across reloads.
- [ ] Reduced-motion setting disables auto-rotation and the unfold.
- [ ] Graph doesn't trigger change detection every frame (check with Angular DevTools profiler), and navigating away leaves no running rAF loop or listeners.
- [ ] On mobile: single column, graph 440px tall, vertical scroll works over the graph, nav links hidden, toggle visible.
- [ ] Contact form validates, submits (or is stubbed against §8), and shows success and error states.
- [ ] Placeholders still in brackets are listed in your final report: project names, descriptions and years for projects 2–4, contact email, reply time.

## 11. Placeholders the owner must supply

`[Projekt 2–4]` / `[Project 2–4]` names, years and descriptions, and their real tech lists. `[kontakt@mpospieszynski.pl]`. `[X]` business days in the form confirmation. Adding a project only needs a new `Project` entry; the graph lays out any number of projects automatically. A new technology needs a `TechId`, a label, and optionally `techLinks` entries.
