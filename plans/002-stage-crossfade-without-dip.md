# 002 — Make the stage crossfade a clean dissolve

- **Status**: DONE (2026-10-14)
- **Commit**: none (not a git repository yet; written 2026-10-14)
- **Severity**: MEDIUM
- **Category**: Cohesion (crossfade double exposure)
- **Estimated scope**: 1 file, CSS only

## Problem

`frontend/src/app/shared/ui/stage.component.ts:54-64` fades the outgoing view out while the incoming view fades in, both
transparent over the tan stage:

```css
.ui-stage__view { grid-area: 1 / 1; /* … */ opacity: 0; transition: opacity var(--dur-crossfade) var(--ease-in-out); }
.ui-stage__view--active { opacity: 1; }
```

Halfway through the 1600ms fade both views sit near 50% opacity. The large Bodoni figures of two views overlap as a ghost, and
the stage looks emptier for most of a second. This is the page's one signature move, so it should read as one picture dissolving into the next.

## Target

Each view paints the stage colour. The active view sits on top and fades in. The outgoing view stays opaque underneath until
the fade-in finishes, then drops to 0 instantly.

```css
.ui-stage__view {
  grid-area: 1 / 1;
  display: grid;
  align-content: center;
  padding: var(--space-7);
  background: var(--color-stage);
  opacity: 0;
  transition: opacity 0s linear var(--dur-crossfade);
}
.ui-stage__view--active {
  z-index: 1;
  opacity: 1;
  transition: opacity var(--dur-crossfade) var(--ease-in-out);
}
```

`--dur-crossfade` is 1600ms and `--ease-in-out` is `cubic-bezier(0.77, 0, 0.175, 1)`, both in `frontend/src/styles/tokens.scss`.

## Repo conventions to follow

- Tokens only. No new values.

## Steps

1. Replace the two rules in `stage.component.ts` styles with the target CSS. Leave `.ui-stage` unchanged.

## Boundaries

- CSS only. Do not touch the timer logic (plan 001).
- Do not change `--dur-crossfade`. DIRECTION.md fixes it at about 1.6s.

## Verification

- **Mechanical**: `npm run build` passes and axe on `/dev/style-guide` reports 0 violations in both themes.
- **Feel check**: in DevTools Animations at 10%, watch a switch. The new figure appears over the old one with no ghost overlap and no
  lighter dip. Hover Project 1, then 2, then 3 quickly: the last-hovered view ends on top and nothing flashes empty.
- **Done when**: no frame shows two views' text at partial opacity together.
- **Open question for the owner**: a crossfade the visitor triggers by hovering waits 1.6s with an ease-in-out that barely moves
  for the first ~300ms. A shorter fade for pointer selection only (for example 600ms `var(--ease-out)`) would feel more
  responsive. DIRECTION.md only fixes the duration for the automatic change, so this needs a decision.
