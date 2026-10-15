# 001 — Restart the stage hold after a manual selection

- **Status**: DONE (2026-10-14)
- **Commit**: none (not a git repository yet; written 2026-10-14)
- **Severity**: HIGH
- **Category**: Interruptibility
- **Estimated scope**: 1 file, ~15 lines

## Problem

`frontend/src/app/shared/ui/stage.component.ts:96-101` runs a fixed `setInterval` that never resets:

```ts
const timer = setInterval(() => {
  if (document.visibilityState === 'visible' && this.count() > 1) {
    this.select((this.current() + 1) % this.count());
  }
}, HOLD_MS);
```

`select(index)` (line 105) is also what pages call on hover, focus and scroll. If a visitor points at project 1 a second before the
interval fires, the stage jumps to the next view about one second later, while they are still pointing at project 1. The signature
move then fights the visitor. DIRECTION.md (Motion) says the stage "changes when the matching project or section is pointed at";
it must then hold that view for a full `--stage-hold` (5500ms).

## Target

- A user selection restarts the hold: the next automatic advance happens 5500ms after the last `select()`.
- Automatic advances use the same restartable timer (a `setTimeout` chain, not `setInterval`).
- The behaviour is unchanged under reduced motion, while the tab is hidden, during SSR and when `autoplay` is false (no timer at all).

## Repo conventions to follow

- Signals plus `afterNextRender` and `DestroyRef` cleanup, as in the same file (lines 83-102).
- `HOLD_MS = 5500` stays the single constant, mirroring `--stage-hold` in `frontend/src/styles/tokens.scss`.

## Steps

1. In `StageComponent`, add `private timer?: ReturnType<typeof setTimeout>;` and `private playing = false;`.
2. Add `schedule()`: clear the timer; return if not playing; otherwise `setTimeout` for `HOLD_MS`. The callback advances
   `current` to `(current + 1) % count` when the tab is visible and `count > 1`, then calls `schedule()` again.
3. In `afterNextRender`, replace the `setInterval` block with `this.playing = true; this.schedule();` and, on destroy, set `playing = false` and clear the timer.
4. In `select(index)`, after `this.current.set(index)`, call `this.schedule()` (a no-op when not playing).

## Boundaries

- Do NOT change the CSS crossfade (plan 002 covers it).
- Do NOT add pause-on-hover for whole lists; pages decide that in S-tasks.

## Verification

- **Mechanical**: `npm test -- --watch=false` and `npm run build` in `frontend/` pass.
- **Feel check**: open `/dev/style-guide`, Split stage section. Hover "Project 1" about 5s after load and keep the pointer still:
  the stage shows "25 min" and stays for a full 5.5s before advancing. With reduced motion emulated, the stage never advances.
- **Done when**: no automatic advance happens within 5500ms of any `select()` call.
