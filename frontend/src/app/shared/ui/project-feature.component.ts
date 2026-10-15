import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { TechTagComponent } from './tech-tag.component';

export interface TechRef {
  slug: string;
  name: string;
}

/**
 * A featured project row: image, title, measured outcome, meta and tags (docs/UI-UX-DESIGN.md §7).
 * Polish-only projects on English pages carry a label and link to the Polish case study.
 */
@Component({
  selector: 'ui-project-feature',
  imports: [RouterLink, TranslocoPipe, TechTagComponent, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="feature">
      @if (imageUrl()) {
        <img
          class="feature__image"
          [src]="imageUrl()"
          [alt]="imageAlt() ?? ''"
          width="640"
          height="400"
          loading="lazy"
        />
      }
      <div class="feature__text">
        <ng-template #titleLink>
          <a
            class="feature__link"
            [routerLink]="link()"
            [attr.hreflang]="polishOnly() ? 'pl' : null"
            [attr.lang]="polishOnly() ? 'pl' : null"
            >{{ title() }}</a
          >
        </ng-template>
        @if (headingLevel() === 2) {
          <h2 class="feature__title"><ng-container [ngTemplateOutlet]="titleLink" /></h2>
        } @else {
          <h3 class="feature__title"><ng-container [ngTemplateOutlet]="titleLink" /></h3>
        }
        <p class="feature__outcome" [attr.lang]="polishOnly() ? 'pl' : null">{{ outcome() }}</p>
        @if (meta() || polishOnly()) {
          <p class="text-small text-muted">
            {{ meta() }}
            @if (polishOnly()) {
              <span class="feature__label">{{ 'common.polishOnly' | transloco }}</span>
            }
          </p>
        }
        @if (tags().length) {
          <ul role="list" class="feature__tags">
            @for (tag of tags(); track tag.slug) {
              <li><ui-tech-tag [slug]="tag.slug" [name]="tag.name" /></li>
            }
          </ul>
        }
      </div>
    </article>
  `,
  styles: `
    .feature {
      display: grid;
      gap: var(--space-5) var(--space-6);
      padding: 28px 0;
      border-top: 1px solid var(--color-line);
    }
    @media (min-width: 900px) {
      .feature {
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        align-items: start;
      }
      .feature__image {
        order: 2;
      }
    }
    .feature__image {
      width: 100%;
      height: auto;
      border: 1px solid var(--color-line);
      border-radius: var(--radius-panel);
    }
    .feature__text {
      display: grid;
      gap: var(--space-3);
    }
    .feature__title {
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .feature__link {
      text-decoration: none;
    }
    .feature__link:hover {
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }
    .feature__outcome {
      max-width: 60ch;
      color: var(--color-body);
      line-height: 1.65;
    }
    .feature__label {
      margin-left: var(--space-2);
      padding: 2px var(--space-2);
      border-radius: var(--radius-tag);
      background: var(--color-stage);
      color: var(--color-stage-ink);
      font-weight: 600;
    }
    .feature__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
  `,
})
export class ProjectFeatureComponent {
  readonly title = input.required<string>();
  readonly outcome = input.required<string>();
  /** Localised path of the case study (the Polish one for Polish-only projects). */
  readonly link = input.required<string>();
  readonly meta = input<string>();
  readonly imageUrl = input<string>();
  readonly imageAlt = input<string>();
  readonly tags = input<TechRef[]>([]);
  readonly polishOnly = input(false);
  /** 2 where the cards sit right under the page's h1 (projects list), 3 inside a titled section. */
  readonly headingLevel = input<2 | 3>(3);
}
