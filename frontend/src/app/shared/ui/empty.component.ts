import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Empty state: one message and one action (projected). */
@Component({
  selector: 'ui-empty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty card" role="status">
      <p class="text-lead">{{ message() }}</p>
      <ng-content />
    </div>
  `,
  styles: `
    .empty {
      display: grid;
      gap: var(--space-4);
      justify-items: start;
    }
  `,
})
export class EmptyComponent {
  readonly message = input.required<string>();
}
