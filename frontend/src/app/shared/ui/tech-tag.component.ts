import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LocalizedPathPipe } from '../../core/i18n/localized-path.pipe';

/** A technology as a text chip linking to the projects that use it (/projekty?tech=<slug>, /en/projects?tech=). */
@Component({
  selector: 'ui-tech-tag',
  imports: [RouterLink, LocalizedPathPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a
    class="tag"
    [routerLink]="'projects' | localizedPath"
    [queryParams]="{ tech: slug() }"
    >{{ name() }}</a
  >`,
  styles: `
    .tag {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 5px 12px;
      border: 1px solid var(--color-control);
      border-radius: var(--radius-tag);
      color: var(--color-soft);
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      transition:
        border-color var(--dur-hover) ease,
        color var(--dur-hover) ease;
    }
    .tag:hover {
      border-color: var(--color-ink);
      color: var(--color-ink);
    }
  `,
})
export class TechTagComponent {
  readonly slug = input.required<string>();
  readonly name = input.required<string>();
}
