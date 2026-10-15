import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { LocalizedPathPipe } from '../core/i18n/localized-path.pipe';
import { Lang } from '../core/i18n/route-table';
import { ProfileStore } from '../core/profile/profile.store';
import { NAV_ITEMS } from './site-header.component';

const SOCIAL_ORDER = ['github', 'linkedin', 'email'] as const;

/**
 * Footer of every public page (app-shell spec, DIRECTION.md): one ruled band with the section links, social links,
 * "How this site is built" (only when the profile names the site's own case study), privacy, © and the domain.
 */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, TranslocoPipe, LocalizedPathPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="footer" data-testid="footer">
      <div class="container footer__inner">
        <nav class="footer__nav" [attr.aria-label]="'nav.footer' | transloco">
          <ul role="list" class="footer__list">
            @for (item of navItems; track item) {
              <li>
                <a [routerLink]="item | localizedPath">{{ 'nav.' + item | transloco }}</a>
              </li>
            }
            @if (siteProject(); as site) {
              <li>
                <a
                  [routerLink]="'project' | localizedPath: { slug: site.slug } : site.lang"
                  data-testid="how-built"
                  >{{ 'footer.howBuilt' | transloco }}</a
                >
              </li>
            }
            <li>
              <a [routerLink]="'privacy' | localizedPath">{{ 'footer.privacy' | transloco }}</a>
            </li>
          </ul>
          @if (social().length) {
            <ul role="list" class="footer__list" [attr.aria-label]="'footer.social.label' | transloco">
              @for (link of social(); track link.kind) {
                <li>
                  <a [href]="link.href" [attr.rel]="link.kind === 'email' ? null : 'me noopener'">{{
                    'common.social.' + link.kind | transloco
                  }}</a>
                </li>
              }
            </ul>
          }
        </nav>
        <p class="footer__legal">
          <span>{{ 'footer.copyright' | transloco: { year: year, name: profile()?.fullName ?? '' } }}</span>
          <span>{{ 'footer.domain' | transloco }}</span>
        </p>
      </div>
    </footer>
  `,
  styles: `
    :host {
      display: block;
    }
    .footer {
      border-top: 1px solid var(--color-line);
      color: var(--color-muted);
      font-size: var(--step-small);
    }
    .footer__inner {
      display: grid;
      gap: var(--space-4);
      padding-block: 28px;
    }
    .footer__nav {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-3) var(--space-6);
    }
    .footer__list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-5);
      margin: 0;

      a {
        display: inline-flex;
        align-items: center;
        min-height: var(--tap);
        color: var(--color-muted);
        text-decoration: none;
      }

      a:hover {
        color: var(--color-ink);
      }
    }
    .footer__legal {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-4);
    }
  `,
})
export class SiteFooterComponent {
  private readonly store = inject(ProfileStore);

  protected readonly navItems = NAV_ITEMS;
  protected readonly year = new Date().getFullYear();
  protected readonly profile = this.store.profile;

  protected readonly siteProject = computed(() => {
    const site = this.profile()?.siteProject;
    return site?.slug && site.lang ? { slug: site.slug, lang: site.lang as Lang } : null;
  });

  protected readonly social = computed(() => {
    const links = this.profile()?.socialLinks ?? {};
    return SOCIAL_ORDER.filter((kind) => links[kind]).map((kind) => ({
      kind,
      href:
        kind === 'email' && !links[kind].startsWith('mailto:')
          ? `mailto:${links[kind]}`
          : links[kind],
    }));
  });
}
