import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import privacyEn from '../../../assets/content/privacy.en.md';
import privacyPl from '../../../assets/content/privacy.pl.md';
import { LanguageService } from '../../core/i18n/language.service';
import { Lang } from '../../core/i18n/route-table';
import { SeoService } from '../../core/seo/seo.service';
import { MarkdownComponent, slugify } from '../../shared/ui/markdown.component';

const SOURCES: Record<Lang, string> = { pl: privacyPl, en: privacyEn };

/** Front matter (`updated: yyyy-mm-dd`) and body of a bundled Markdown document. */
export function parseDocument(source: string): { updated: string | null; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) {
    return { updated: null, body: source };
  }
  const updated = /^updated:\s*(\S+)/m.exec(match[1])?.[1] ?? null;
  return { updated, body: source.slice(match[0].length) };
}

/**
 * Privacy policy (docs/screens/public/09-privacy.md): Markdown kept in the repository and bundled, so it renders
 * during SSR without a request; a table of contents links to each h2.
 */
@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink, TranslocoPipe, MarkdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="container privacy" data-testid="privacy">
      <header class="page-head">
        <h1>{{ 'privacy.title' | transloco }}</h1>
        @if (document().updated) {
          <p class="text-muted">
            {{ 'privacy.updated' | transloco: { date: updatedLabel() } }}
          </p>
        }
      </header>
      <nav
        class="privacy__toc card"
        [attr.aria-label]="'privacy.toc' | transloco"
        data-testid="toc"
      >
        <p class="text-small text-muted">{{ 'privacy.toc' | transloco }}</p>
        <ol>
          @for (heading of toc(); track heading.id) {
            <!-- A router link: with <base href="/"> a bare "#id" would point at the home page. -->
            <li>
              <a [routerLink]="[]" [fragment]="heading.id">{{ heading.text }}</a>
            </li>
          }
        </ol>
      </nav>
      <ui-markdown class="privacy__body" [markdown]="document().body" [headingIds]="true" />
    </article>
  `,
  styles: `
    .privacy {
      display: grid;
      gap: var(--space-7);
      max-width: calc(var(--prose) + 2 * var(--page-gutter));
      padding-bottom: var(--section-pad);
    }
    .page-head {
      padding-bottom: 0;
    }
    .privacy__toc {
      display: grid;
      gap: var(--space-3);
      max-width: var(--prose);
      padding: var(--space-5) var(--space-6);

      ol {
        display: grid;
        gap: var(--space-1);
        padding-left: var(--space-5);
      }
    }
    .privacy__body {
      color: var(--color-body);
    }
    .privacy__body h2 {
      font-size: 1.625rem;
      line-height: 1.15;
      scroll-margin-top: var(--space-5);
    }
  `,
})
export class PrivacyPage {
  private readonly language = inject(LanguageService);

  protected readonly document = computed(() => parseDocument(SOURCES[this.language.lang()]));

  protected readonly toc = computed(() =>
    [...this.document().body.matchAll(/^## (.+)$/gm)].map(([, text]) => ({
      id: slugify(text.trim()),
      text: text.trim(),
    })),
  );

  protected readonly updatedLabel = computed(() => {
    const updated = this.document().updated;
    return updated
      ? new Intl.DateTimeFormat(this.language.lang() === 'pl' ? 'pl-PL' : 'en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(`${updated}T12:00:00Z`))
      : '';
  });

  constructor() {
    const seo = inject(SeoService);
    const transloco = inject(TranslocoService);
    effect(() => {
      const body = this.document().body;
      seo.update({
        title: transloco.translate('privacy.title'),
        description:
          body
            .split(/\n\s*\n/)
            .find((p) => p.trim() && !p.startsWith('#'))
            ?.trim() ?? '',
        alternates: 'privacy',
      });
    });
  }
}
