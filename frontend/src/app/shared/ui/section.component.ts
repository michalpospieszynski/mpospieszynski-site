import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

/** A page section: sentence-case heading, optional intro, content. Labelled by its heading. */
@Component({
  selector: 'ui-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section" [attr.aria-labelledby]="headingId">
      <h2 [id]="headingId">{{ heading() }}</h2>
      @if (intro()) {
        <p class="text-lead text-muted measure">{{ intro() }}</p>
      }
      <div class="section__body"><ng-content /></div>
    </section>
  `,
  styles: `
    .section {
      display: grid;
      gap: var(--space-5);
    }
    .section__body {
      display: grid;
      gap: var(--space-5);
    }
  `,
})
export class SectionComponent {
  readonly heading = input.required<string>();
  readonly intro = input<string>();

  protected readonly headingId = `ui-section-${nextId++}`;
}
