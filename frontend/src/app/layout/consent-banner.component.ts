import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AnalyticsService } from '../core/analytics/analytics.service';
import { ConsentService } from '../core/consent/consent.service';
import { LocalizedPathPipe } from '../core/i18n/localized-path.pipe';
import { ButtonComponent } from '../shared/ui/button.component';

/**
 * The cookie banner (docs/ANALYTICS.md §4): a panel at the bottom of the screen with two equal choices, shown while
 * the visitor has not decided or after "Cookie settings" in the footer. Not a modal: the page stays usable and focus
 * is not moved. Browser-only (the server cannot know the choice) and only when analytics is configured.
 */
@Component({
  selector: 'app-consent-banner',
  imports: [RouterLink, TranslocoPipe, LocalizedPathPipe, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <section
        class="consent"
        [attr.aria-label]="'consent.label' | transloco"
        data-testid="consent-banner"
      >
        <p class="consent__text">
          {{ 'consent.text' | transloco }}
          <a [routerLink]="'privacy' | localizedPath">{{ 'consent.policy' | transloco }}</a>
        </p>
        @if (consent.choice() !== 'pending') {
          <p class="consent__current" data-testid="consent-current">
            {{ 'consent.current.' + consent.choice() | transloco }}
          </p>
        }
        <div class="consent__actions">
          <ui-button variant="ghost" (click)="consent.accept()" data-testid="consent-accept">{{
            'consent.accept' | transloco
          }}</ui-button>
          <ui-button variant="ghost" (click)="consent.reject()" data-testid="consent-reject">{{
            'consent.reject' | transloco
          }}</ui-button>
        </div>
      </section>
    }
  `,
  styles: `
    .consent {
      position: fixed;
      z-index: 20;
      inset: auto var(--space-4) var(--space-4) var(--space-4);
      display: grid;
      gap: var(--space-3);
      padding: var(--space-5);
      border: 1px solid var(--color-line);
      border-radius: var(--radius-card);
      background: var(--color-raised);
      color: var(--color-body);
      font-size: var(--step-small);
      animation: consent-in var(--dur-sheet) var(--ease-out);

      @media (min-width: 768px) {
        right: auto;
        max-width: 440px;
        left: var(--space-5);
        bottom: var(--space-5);
      }
    }
    .consent__text,
    .consent__current {
      margin: 0;
    }
    .consent__current {
      color: var(--color-muted);
    }
    .consent__text a {
      color: var(--color-ink);
    }
    .consent__actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-2);
    }
    @keyframes consent-in {
      from {
        opacity: 0;
        transform: translateY(var(--rise));
      }
    }
  `,
})
export class ConsentBannerComponent {
  protected readonly consent = inject(ConsentService);
  private readonly analytics = inject(AnalyticsService);

  /** After hydration only, so the server HTML never contains it and it never flashes for decided visitors. */
  private readonly hydrated = signal(false);

  protected readonly visible = computed(
    () => this.hydrated() && this.analytics.enabled && this.consent.bannerOpen(),
  );

  constructor() {
    afterNextRender(() => this.hydrated.set(true));
  }
}
