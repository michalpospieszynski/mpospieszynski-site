import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { LanguageService } from '../../core/i18n/language.service';
import { LocalizedPathPipe } from '../../core/i18n/localized-path.pipe';
import { localizedUrl } from '../../core/i18n/route-table';
import { ProfileStore } from '../../core/profile/profile.store';
import { personJsonLd, profilePageJsonLd } from '../../core/seo/json-ld';
import { SITE_ORIGIN, SeoService } from '../../core/seo/seo.service';
import { ButtonComponent } from '../../shared/ui/button.component';
import { MarkdownComponent } from '../../shared/ui/markdown.component';

const SOCIAL_ORDER = ['github', 'linkedin', 'email'] as const;

/**
 * About (docs/screens/public/07-about.md): who I am and how I work, from the profile the shell already loaded.
 * No CV, employer timeline or job-seeking language.
 */
@Component({
  selector: 'app-about-page',
  imports: [TranslocoPipe, LocalizedPathPipe, ButtonComponent, MarkdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (profile(); as p) {
      <article class="container about" data-testid="about">
        <header class="page-head">
          <h1>{{ 'about.title' | transloco }}</h1>
        </header>

        <div class="about__intro" [class.about__intro--portrait]="p.portrait">
          @if (p.portrait; as portrait) {
            <img
              class="about__portrait"
              [src]="portrait.url"
              [alt]="portrait.alt ?? ''"
              [attr.width]="portrait.width"
              [attr.height]="portrait.height"
              loading="eager"
              data-testid="portrait"
            />
          }
          @if (p.aboutMd) {
            <ui-markdown
              [markdown]="p.aboutMd"
              [lang]="fallback() ? 'pl' : undefined"
              data-testid="about-text"
            />
          }
        </div>

        @if (p.approachMd) {
          <section class="about__section" aria-labelledby="approach-heading" data-testid="approach">
            <h2 id="approach-heading" class="section__title">{{ 'about.approach' | transloco }}</h2>
            <ui-markdown [markdown]="p.approachMd" [lang]="fallback() ? 'pl' : undefined" />
          </section>
        }

        @if (links().length) {
          <section class="about__section" aria-labelledby="links-heading" data-testid="links">
            <h2 id="links-heading" class="section__title">{{ 'about.links' | transloco }}</h2>
            <ul role="list" class="about__links">
              @for (link of links(); track link.kind) {
                <li>
                  <a [href]="link.href" [attr.rel]="link.kind === 'email' ? null : 'me noopener'">{{
                    'common.social.' + link.kind | transloco
                  }}</a>
                  @if (link.kind === 'email') {
                    <span class="text-muted"> · {{ link.text }}</span>
                  }
                </li>
              }
            </ul>
          </section>
        }

        <aside class="cta" aria-labelledby="about-cta">
          <h2 id="about-cta">{{ 'about.cta.title' | transloco }}</h2>
          <ui-button variant="ink" [link]="'contact' | localizedPath">{{
            'about.cta.action' | transloco
          }}</ui-button>
        </aside>
      </article>
    }
  `,
  styles: `
    .about {
      display: grid;
      gap: var(--space-8);
      padding-bottom: var(--section-pad);
    }
    .page-head {
      padding-bottom: 0;
    }
    @media (min-width: 900px) {
      .about__intro--portrait {
        display: grid;
        grid-template-columns: 16rem minmax(0, var(--prose));
        gap: 56px;
        align-items: start;
      }
    }
    .about__intro ui-markdown {
      display: block;
      max-width: var(--prose);
      color: var(--color-body);
      font-size: var(--step-lead);
      line-height: 1.6;
    }
    .about__section ui-markdown {
      display: block;
      max-width: var(--prose);
      color: var(--color-body);
    }
    .about__portrait {
      width: 100%;
      max-width: 16rem;
      height: auto;
      margin-bottom: var(--space-5);
      border: 1px solid var(--color-line);
      border-radius: var(--radius-card);
    }
    .about__section {
      display: grid;
      gap: var(--space-5);
      padding-top: var(--space-7);
      border-top: 1px solid var(--color-line);
    }
    .about__links {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-6);
      font-weight: 600;
    }
  `,
})
export class AboutPage {
  private readonly language = inject(LanguageService);

  protected readonly profile = inject(ProfileStore).profile;

  /** The profile text is Polish on an English page when it has no English version. */
  protected readonly fallback = computed(() => {
    const lang = this.profile()?.lang;
    return !!lang && lang !== this.language.lang();
  });

  protected readonly links = computed(() => {
    const links = this.profile()?.socialLinks ?? {};
    return SOCIAL_ORDER.filter((kind) => links[kind]).map((kind) => {
      const value = links[kind];
      const isEmail = kind === 'email';
      return {
        kind,
        href: isEmail && !value.startsWith('mailto:') ? `mailto:${value}` : value,
        text: isEmail ? value.replace(/^mailto:/, '') : value,
      };
    });
  });

  constructor() {
    const seo = inject(SeoService);
    const transloco = inject(TranslocoService);
    const origin = inject(SITE_ORIGIN);
    effect(() => {
      const p = this.profile();
      const lang = this.language.lang();
      const firstSentence =
        (p?.aboutMd ?? '')
          .replace(/\s+/g, ' ')
          .trim()
          .split(/(?<=[.!?])\s/)[0] ?? '';
      const person = {
        ...personJsonLd({
          name: p?.fullName ?? '',
          url: new URL(localizedUrl('home', lang), origin + '/').toString(),
          sameAs: Object.entries(p?.socialLinks ?? {})
            .filter(([kind]) => kind !== 'email')
            .map(([, url]) => url),
        }),
        ...(p?.portrait?.url ? { image: new URL(p.portrait.url, origin + '/').toString() } : {}),
      };
      seo.update({
        title: transloco.translate('about.title'),
        description: firstSentence,
        alternates: 'about',
        jsonLd: profilePageJsonLd({
          url: new URL(localizedUrl('about', lang), origin + '/').toString(),
          inLanguage: lang,
          person,
        }),
      });
    });
  }
}
