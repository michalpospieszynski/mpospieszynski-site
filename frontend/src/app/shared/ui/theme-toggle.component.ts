import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ThemeService } from '../../core/theme/theme.service';

/**
 * Light/dark switch for the public header and the admin top bar: a round outline button showing the theme it
 * switches to (sun or moon), named after what it does (no aria-pressed: the name already changes).
 */
@Component({
  selector: 'ui-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="toggle"
      [attr.aria-label]="label()"
      [attr.title]="label()"
      (click)="themes.toggle()"
      data-testid="theme-toggle"
    >
      <!-- Both icons are always rendered and CSS shows the right one, so the server's markup (dark default) matches
           the browser's whatever theme index.html applied: hydration needs the same DOM. -->
      <!-- Moon: switches to dark. -->
      <svg
        class="icon icon--moon"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="currentColor" />
      </svg>
      <!-- Sun: switches to light. -->
      <svg
        class="icon icon--sun"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="4.5" fill="currentColor" />
        <path
          d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .toggle {
      display: inline-grid;
      place-items: center;
      width: var(--tap);
      height: var(--tap);
      padding: 0;
      border: 1px solid var(--color-control);
      border-radius: var(--radius-pill);
      background: transparent;
      color: var(--color-ink);
      cursor: pointer;
      transition:
        background-color var(--dur-hover) ease,
        transform var(--dur-press) var(--ease-out);
    }
    .toggle:hover {
      background: var(--color-raised-2);
    }
    .toggle:active {
      transform: scale(var(--press));
    }
    .icon--moon,
    :host-context([data-theme='light']) .icon--sun {
      display: none;
    }
    :host-context([data-theme='light']) .icon--moon {
      display: block;
    }
  `,
})
export class ThemeToggleComponent {
  /** Name of the button while dark (it switches to light). */
  readonly toLight = input.required<string>();
  /** Name of the button while light (it switches to dark). */
  readonly toDark = input.required<string>();

  protected readonly themes = inject(ThemeService);
  protected readonly light = computed(() => this.themes.theme() === 'light');
  protected readonly label = computed(() => (this.light() ? this.toDark() : this.toLight()));
}
