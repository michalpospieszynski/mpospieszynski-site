# 005 — The stripe inside the primary button on hover

- **Status**: TODO (needs the owner's go-ahead: additive motion)
- **Commit**: none (not a git repository yet; written 2026-10-15)
- **Severity**: LOW
- **Category**: Missed opportunity
- **Estimated scope**: 1 file, CSS only

## Problem

DIRECTION.md (Composition, Hero; Motion, Feedback): "Buttons darken on hover and show the stripe inside." The
primary `ui-button` only darkens (`frontend/src/app/shared/ui/button.component.ts`: `.btn--primary:hover { filter:
brightness(0.92) }`). The stripe is the site's one ornament and is meant to recur here.

## Target

A thin band of alternating 6px bars along the bottom edge of the primary button, revealed on hover/focus-visible by
scaling it from the left: `transform: scaleX(0)` → `scaleX(1)`, `transform-origin: left`, 180ms (`--dur-hover`)
with `--ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)`). The house rules forbid gradients (any `*-gradient()`, layered or
not), so draw the bars as an inline SVG pattern (`::after` with `background-image: url("data:image/svg+xml,…")`,
two 6×4 rects) in the stripe colours `#2b2216` / `#e4e2da`, matching `ui-stripe`. Height 4px.
No change under reduced motion other than dropping the scale animation (show instantly).

## Repo conventions to follow

- The stripe's colours and bar logic: `frontend/src/app/shared/ui/stripe.component.ts`.

## Steps

1. In `button.component.ts`, give `.btn--primary` `position: relative; overflow: hidden` and add the `::after` band.
2. Reveal it on `:hover` and `:focus-visible`; keep the darkening.
3. Reduced motion: `transition: none` for the band.

## Boundaries

- Primary variant only. CSS only. Contrast of the label stays above 4.5:1 (the band sits below the text).

## Verification

- **Mechanical**: `npm run check:contrast`, axe on `/dev/style-guide` in both themes.
- **Feel check**: hover the hero button at 10% speed in DevTools: the band draws left to right; leaving undoes it.
- **Done when**: primary buttons show the band on hover and focus in both themes.
