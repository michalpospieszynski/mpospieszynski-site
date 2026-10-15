# 003 — Fix tech-tag colour snap and press on disabled buttons

- **Status**: DONE (2026-10-14)
- **Commit**: none (not a git repository yet; written 2026-10-14)
- **Severity**: LOW
- **Category**: Easing & duration / Accessibility
- **Estimated scope**: 2 files, a few lines each

## Problem

1. `frontend/src/app/shared/ui/tech-tag.component.ts:22` transitions only the background, so on hover the text colour flips to
   `--color-stage-ink` at once while the background is still raised. For about 180ms the text is dark on dark (dark theme):
   `transition: background-color var(--dur-hover) ease;`
2. `frontend/src/app/shared/ui/button.component.ts:58-60` scales every button on press, disabled ones included, and keeps the scale
   under reduced motion: `.btn:active { transform: scale(0.97); }`

## Target

```css
/* tech-tag */
transition: background-color var(--dur-hover) ease, color var(--dur-hover) ease;

/* button */
.btn:not(:disabled):active { transform: scale(0.97); }
@media (prefers-reduced-motion: reduce) { .btn:not(:disabled):active { transform: none; } }
```

## Repo conventions to follow

- Exemplar for paired colour transitions: `frontend/src/app/shared/ui/project-item.component.ts:31-33`.

## Steps

1. tech-tag: replace the `transition` line as above.
2. button: change `.btn:active` to `.btn:not(:disabled):active` and add the reduced-motion block after it.

## Boundaries

- Keep `filter: brightness(0.92)` on hover; "darken on hover" is the specified feedback.

## Verification

- **Mechanical**: `npm test -- --watch=false` passes.
- **Feel check**: hover a tech tag at 10% speed. Text and background change together. Pressing the disabled button does not move it.
- **Done when**: both selectors match the target.
