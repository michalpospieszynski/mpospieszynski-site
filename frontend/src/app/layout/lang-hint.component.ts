import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { LanguageService } from '../core/i18n/language.service';
import { SeoService } from '../core/seo/seo.service';

/**
 * "This site is also available in English." on Polish pages, for browsers whose first language is English
 * (app-shell spec). Browser-only, so the server HTML never contains it; written in English on purpose.
 */
@Component({
  selector: 'app-lang-hint',
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <aside
        class="hint"
        lang="en"
        aria-labelledby="lang-hint-text"
        data-testid="lang-hint"
      >
        <p id="lang-hint-text">{{ 'shell.langHint.text' | transloco }}</p>
        <a
          [routerLink]="target()"
          hreflang="en"
          (click)="dismiss()"
          data-testid="lang-hint-switch"
          >{{ 'shell.langHint.action' | transloco }}</a
        >
        <button type="button" (click)="dismiss()" data-testid="lang-hint-dismiss">
          {{ 'shell.langHint.dismiss' | transloco }}
        </button>
      </aside>
    }
  `,
  styles: `
    .hint {
      border-bottom: 1px solid var(--color-line);
      background: var(--color-band);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2) var(--space-5);
      padding: var(--space-3) var(--page-gutter);
      font-size: var(--step-small);
    }
    p {
      margin-right: auto;
    }
    a {
      color: var(--color-ink);
      font-weight: 600;
    }
    button {
      min-height: 44px;
      padding-inline: var(--space-4);
      border: 0;
      background: transparent;
      color: var(--color-ink);
      text-decoration: underline;
      cursor: pointer;
    }
  `,
})
export class LangHintComponent {
  private readonly language = inject(LanguageService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  /** Set once in the browser: English-first visitor who hasn't dismissed the hint before. */
  private readonly eligible = signal(false);

  protected readonly visible = computed(() => this.eligible() && this.language.lang() === 'pl');
  protected readonly target = computed(() =>
    this.router.parseUrl(this.language.switchUrl(this.seo.alternates())),
  );

  constructor() {
    afterNextRender(() => {
      const first = navigator.languages?.[0] ?? navigator.language ?? '';
      this.eligible.set(
        first.toLowerCase().startsWith('en') && !this.language.isLangHintDismissed(),
      );
    });
  }

  protected dismiss(): void {
    this.language.dismissLangHint();
    this.eligible.set(false);
  }
}
