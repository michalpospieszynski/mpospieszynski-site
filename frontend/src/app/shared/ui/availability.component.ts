import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

export type AvailabilityStatus = 'OPEN' | 'LIMITED' | 'CLOSED';

/** Availability for new projects: a dot plus text, never colour alone (docs/UI-UX-DESIGN.md §7). */
@Component({
  selector: 'ui-availability',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="dot" [class]="'dot dot--' + tone()" aria-hidden="true"></span>
    <span>{{ 'common.availability.' + status().toLowerCase() | transloco }}</span>
    @if (from()) {
      <span class="text-muted"
        >· {{ 'common.availability.from' | transloco: { date: from() } }}</span
      >
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex: none;
    }
    .dot--ok {
      background: var(--color-ok);
    }
    .dot--busy {
      background: var(--color-busy);
    }
    .dot--limited {
      border: 2px solid var(--color-ink);
    }
  `,
})
export class AvailabilityComponent {
  readonly status = input.required<AvailabilityStatus>();
  /** Already formatted for the page language. */
  readonly from = input<string>();

  protected readonly tone = computed(() =>
    this.status() === 'OPEN' ? 'ok' : this.status() === 'CLOSED' ? 'busy' : 'limited',
  );
}
