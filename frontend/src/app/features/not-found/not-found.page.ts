import { ChangeDetectionStrategy, Component, RESPONSE_INIT, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { LocalizedPathPipe } from '../../core/i18n/localized-path.pipe';
import { SeoService } from '../../core/seo/seo.service';
import { ButtonComponent } from '../../shared/ui/button.component';

/**
 * Not found (docs/screens/public/10-not-found.md): the last route of each language tree, and where resolvers
 * send an API 404 (`orNotFound`). Answers HTTP 404 during SSR and is never indexed.
 */
@Component({
  selector: 'app-not-found-page',
  imports: [TranslocoPipe, LocalizedPathPipe, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container not-found" data-testid="not-found">
      <h1 class="not-found__title">{{ 'notFound.title' | transloco }}</h1>
      <p class="not-found__text">{{ 'notFound.text' | transloco }}</p>
      <div class="not-found__actions">
        <ui-button [link]="'home' | localizedPath">{{ 'notFound.home' | transloco }}</ui-button>
        <ui-button variant="ghost" [link]="'projects' | localizedPath">{{
          'notFound.projects' | transloco
        }}</ui-button>
      </div>
    </section>
  `,
  styles: `
    .not-found {
      display: grid;
      justify-items: center;
      gap: var(--space-5);
      padding-block: var(--space-10) var(--section-pad);
      text-align: center;
    }
    .not-found__title {
      max-width: 18ch;
      font-size: var(--step-display);
    }
    .not-found__text {
      max-width: 44ch;
      color: var(--color-muted);
      font-size: var(--step-lead);
    }
    .not-found__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-3);
      margin-top: var(--space-3);
    }
  `,
})
export class NotFoundPage {
  constructor() {
    // Server only (null in the browser): the response carries a real 404 for crawlers.
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) {
      response.status = 404;
    }
    inject(SeoService).update({
      title: inject(TranslocoService).translate('notFound.title'),
      noindex: true,
    });
  }
}
