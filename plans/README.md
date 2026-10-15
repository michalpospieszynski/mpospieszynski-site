# Animation plans

Written by the `improve-animations` audit after the F1–F6 phase (2026-10-14).

| # | Plan | Severity | Status |
| --- | --- | --- | --- |
| 001 | [Restart the stage hold after a manual selection](001-stage-autoplay-respects-selection.md) | HIGH | DONE |
| 002 | [Make the stage crossfade a clean dissolve](002-stage-crossfade-without-dip.md) | MEDIUM | DONE |
| 003 | [Tech-tag colour snap, press on disabled buttons](003-control-feedback-details.md) | LOW | DONE |

Order: 001, 002, 003. They are independent: 001 and 002 touch the same file but different parts (logic and CSS).

## After the public screens (S1–S10), 2026-10-15

| # | Plan | Severity | Status |
| --- | --- | --- | --- |
| 004 | [Staggered section entrances](004-section-entrances.md) | MEDIUM | TODO, awaiting go-ahead |
| 005 | [The stripe inside the primary button on hover](005-button-stripe-hover.md) | LOW | TODO, awaiting go-ahead |

Fixed directly during the screen tasks (no plan): the trace panel's bars now fill in sequence within 600ms, each
taking its share (they were 600ms each with fixed staggers).

Still open from plan 002: whether a stage switch the visitor triggers by pointing should be shorter than the
1.6s automatic crossfade.
