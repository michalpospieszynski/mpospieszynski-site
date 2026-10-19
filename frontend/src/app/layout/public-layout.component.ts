import { ChangeDetectionStrategy, Component, afterNextRender, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AnalyticsService } from '../core/analytics/analytics.service';
import { LanguageService } from '../core/i18n/language.service';
import { localizedUrl } from '../core/i18n/route-table';
import { ProfileStore } from '../core/profile/profile.store';
import { websiteJsonLd } from '../core/seo/json-ld';
import { SITE_ORIGIN, SeoService } from '../core/seo/seo.service';
import { ConsentBannerComponent } from './consent-banner.component';
import { LangHintComponent } from './lang-hint.component';
import { SiteFooterComponent } from './site-footer.component';
import { SiteHeaderComponent } from './site-header.component';

/**
 * Parent component of both language trees (docs/screens/public/01-app-shell.md). Pages render inside
 * <main id="content">, so they start with their own heading and never add another <main>.
 */
@Component({
  selector: 'app-public-layout',
  imports: [
    RouterOutlet,
    SiteHeaderComponent,
    LangHintComponent,
    SiteFooterComponent,
    ConsentBannerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-site-header />
    <app-lang-hint />
    <main id="content" tabindex="-1">
      <router-outlet />
    </main>
    <app-site-footer />
    <app-consent-banner />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100svh;
    }
    main {
      flex: 1;
    }
    main:focus {
      outline: none;
    }
  `,
})
export class PublicLayoutComponent {
  constructor() {
    const store = inject(ProfileStore);
    const seo = inject(SeoService);
    const language = inject(LanguageService);
    const origin = inject(SITE_ORIGIN);
    const analytics = inject(AnalyticsService);

    // Analytics starts with the public site only, never in the admin (docs/ANALYTICS.md).
    afterNextRender(() => analytics.start());

    effect(() => {
      const name = store.profile()?.fullName;
      if (!name) {
        return;
      }
      const lang = language.lang();
      seo.setSiteName(name);
      seo.setSiteJsonLd(
        websiteJsonLd({
          name,
          url: new URL(localizedUrl('home', lang), origin + '/').toString(),
          inLanguage: lang,
        }),
      );
    });
  }
}
