# 004 — Staggered section entrances

- **Status**: TODO (needs the owner's go-ahead: additive motion)
- **Commit**: none (not a git repository yet; written 2026-10-15)
- **Severity**: MEDIUM
- **Category**: Missed opportunity
- **Estimated scope**: 1 new directive, ~8 templates get one attribute

## Problem

DIRECTION.md (Motion) and docs/UI-UX-DESIGN.md §8 ask for entrances: within each section, the heading, then the text,
then the picture rise 16–32px with opacity, staggered 60–90ms, once. Nothing in `frontend/src` does this yet; the
tokens exist but are unused except by the menu sheet (`frontend/src/styles/tokens.scss`: `--dur-entrance: 600ms`,
`--stagger: 75ms`, `--rise: 24px`, `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`). Pages appear all at once.

## Target

A directive `uiReveal` on a section's container. Its direct children get `--i` (0, 1, 2…). When the container first
reaches the viewport (IntersectionObserver, `threshold: 0.15`, then disconnect), it gets the class `is-revealed`.

```css
/* frontend/src/styles/_layout.scss */
.reveal-ready > * {
  opacity: 0;
  transform: translateY(var(--rise));
}
.reveal-ready.is-revealed > * {
  opacity: 1;
  transform: none;
  transition:
    opacity var(--dur-entrance) var(--ease-out),
    transform var(--dur-entrance) var(--ease-out);
  transition-delay: calc(var(--i, 0) * var(--stagger));
}
```

Content must never stay hidden if scripts fail: `reveal-ready` is added by the directive in the browser only
(`afterNextRender`), so the server HTML and no-JS visitors see everything. Sections already in the viewport at
hydration are revealed immediately without moving (add `is-revealed` in the same frame, no transition).
Under `prefers-reduced-motion`, `--rise` is already 0 (`_reset.scss`), so only the opacity fade remains.

## Repo conventions to follow

- Browser-only work behind `afterNextRender` (exemplar: `frontend/src/app/shared/ui/stage.component.ts`).
- Shared UI in `frontend/src/app/shared/ui/`, tokens only.

## Steps

1. Create `frontend/src/app/shared/ui/reveal.directive.ts` (`[uiReveal]`, standalone) as described.
2. Add the CSS above to `_layout.scss`.
3. Apply `uiReveal` to: the home featured and expertise panels, projects list results, case-study sections, skills
   areas and technology groups, services offerings, about sections. Not to the hero, the header, forms or the
   not-found page.

## Boundaries

- Transform and opacity only. No layout properties. No new dependencies.
- Do not delay interaction: elements stay clickable while fading in.

## Verification

- **Mechanical**: `npm test -- --watch=false`, `npm run e2e`, `npm run build`.
- **Feel check**: scroll the home and skills pages slowly; each section's parts arrive heading → text → picture,
  75ms apart, once. Reload mid-page: what is on screen is simply there. With JavaScript off, everything is visible.
  Emulate reduced motion: fades only, no travel.
- **Done when**: every listed section reveals once, and an e2e test with JavaScript disabled still sees all content.
