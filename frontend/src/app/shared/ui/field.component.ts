import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Label, hint and error around a native control. The control is projected and must use `controlId` as its id
 * and `describedBy()` for aria-describedby:
 *   <ui-field #f controlId="email" label="E-mail" [error]="err"><input id="email" [attr.aria-describedby]="f.describedBy()" /></ui-field>
 */
@Component({
  selector: 'ui-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'uiField',
  template: `
    <label class="field__label" [for]="controlId()"
      >{{ label() }}@if (required()) {<span aria-hidden="true"> *</span>}</label
    >
    @if (hint()) {
      <p class="field__hint text-small text-muted" [id]="hintId()">{{ hint() }}</p>
    }
    <ng-content />
    <p class="field__error text-small" [id]="errorId()" aria-live="polite">{{ error() }}</p>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--space-2);
    }
    .field__label {
      font-weight: 500;
    }
    .field__error {
      color: var(--color-busy);
      min-height: 1.45em;
    }
  `,
})
export class FieldComponent {
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
  /** Shows "*" after the label; the control itself carries aria-required. */
  readonly required = input(false);

  readonly hintId = computed(() => `${this.controlId()}-hint`);
  readonly errorId = computed(() => `${this.controlId()}-error`);
  /** Bind to the control's aria-describedby. */
  readonly describedBy = computed(() =>
    [this.hint() ? this.hintId() : null, this.errorId()].filter(Boolean).join(' '),
  );
}
