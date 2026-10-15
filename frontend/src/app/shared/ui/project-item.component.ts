import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/** A compact project row for lists: title on the left; label, kind, technologies and year on the right. */
@Component({
  selector: 'ui-project-item',
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="item" [routerLink]="link()" [attr.hreflang]="polishOnly() ? 'pl' : null">
      <span class="item__title" [attr.lang]="polishOnly() ? 'pl' : null">{{ title() }}</span>
      <span class="item__meta text-small">
        @if (polishOnly()) {
          <span class="item__label">{{ 'common.polishOnly' | transloco }}</span>
        }
        <span>{{ kind() }}</span>
        @if (tech().length) {
          <span>{{ tech().join(' · ') }}</span>
        }
        <span class="tnum">{{ year() }}</span>
      </span>
    </a>
  `,
  styles: `
    .item {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-2) var(--space-5);
      padding: var(--space-5) 0;
      border-top: 1px solid var(--color-line);
      color: var(--color-muted);
      text-decoration: none;
      transition: color var(--dur-hover) ease;
    }
    .item:hover {
      color: var(--color-soft);
    }
    .item:hover .item__title {
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }
    .item__title {
      color: var(--color-ink);
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .item__label {
      color: var(--color-ink);
    }
    .item__meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
  `,
})
export class ProjectItemComponent {
  readonly title = input.required<string>();
  readonly link = input.required<string>();
  readonly kind = input.required<string>();
  readonly tech = input<string[]>([]);
  readonly year = input.required<string | number>();
  /** English page, Polish-only project: the title is Polish and the link leads to the Polish case study. */
  readonly polishOnly = input(false);
}
