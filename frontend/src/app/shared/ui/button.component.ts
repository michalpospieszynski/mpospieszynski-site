import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

export type ButtonVariant = 'primary' | 'ink' | 'ghost' | 'text';
export type ButtonSize = 'md' | 'lg';

/**
 * Pill button (DIRECTION.md, Controls): primary is a champagne fill, ink the ink fill used on champagne surfaces, ghost an outline on ink, text a plain link.
 * Renders a router link for `link`, a plain link for `href` (external or anchors), otherwise a <button>.
 * `pressed` makes it a toggle (aria-pressed), shown filled when on.
 */
@Component({
  selector: 'ui-button',
  imports: [RouterLink, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // One <ng-content> in a template: content projects into a single slot, so branches share it through an outlet.
  template: `
    <ng-template #content><ng-content /></ng-template>
    @if (link(); as path) {
      <a [class]="classes()" [routerLink]="path" [queryParams]="queryParams()" [fragment]="fragment()"
        ><ng-container [ngTemplateOutlet]="content"
      /></a>
    } @else if (href(); as url) {
      <a [class]="classes()" [href]="url" [attr.rel]="url.startsWith('http') ? 'noopener' : null"
        ><ng-container [ngTemplateOutlet]="content"
      /></a>
    } @else {
      <button
        [class]="classes()"
        [type]="type()"
        [disabled]="disabled()"
        [attr.aria-pressed]="pressed() === null ? null : pressed()"
      >
        <ng-container [ngTemplateOutlet]="content" />
      </button>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      min-height: var(--tap);
      padding: 0 18px;
      border: 1px solid transparent;
      border-radius: var(--radius-pill);
      font: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
      transition:
        background-color var(--dur-hover) ease,
        color var(--dur-hover) ease,
        transform var(--dur-press) var(--ease-out);
    }
    .btn--lg {
      min-height: 52px;
      padding: 0 26px;
      font-size: 1rem;
    }
    .btn--primary {
      border-color: var(--color-stage);
      background: var(--color-stage);
      color: var(--color-stage-ink);
      font-weight: 700;
    }
    .btn--primary:hover {
      background: var(--color-stage-hover);
      color: var(--color-stage-ink);
    }
    .btn--ink {
      border-color: var(--color-ground);
      background: var(--color-ground);
      color: var(--color-ink);
      font-weight: 700;
    }
    .btn--ink:hover {
      background: var(--color-raised-2);
      color: var(--color-ink);
    }
    .btn--ink:focus-visible {
      outline-color: var(--color-stage-ink);
    }
    .btn--ghost {
      border-color: var(--color-control);
      background: transparent;
      color: var(--color-ink);
    }
    .btn--ghost:hover {
      background: var(--color-raised-2);
      color: var(--color-ink);
    }
    .btn--ghost[aria-pressed='true'] {
      border-color: var(--color-stage);
      background: var(--color-stage);
      color: var(--color-stage-ink);
      font-weight: 700;
    }
    .btn--text {
      min-height: auto;
      padding: var(--space-2) 0;
      background: transparent;
      color: var(--color-ink);
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }
    .btn:not(:disabled):active {
      transform: scale(var(--press));
    }
    .btn:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  /** Internal path, e.g. from the localizedPath pipe. */
  readonly link = input<string>();
  readonly queryParams = input<Record<string, string>>();
  readonly fragment = input<string>();
  /** External URL or mailto:. */
  readonly href = input<string>();
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  /** Toggle state for aria-pressed; null for an ordinary button. */
  readonly pressed = input<boolean | null>(null);

  protected readonly classes = computed(() => `btn btn--${this.variant()} btn--${this.size()}`);
}
