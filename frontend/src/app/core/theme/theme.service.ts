import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

import { AnalyticsService } from '../analytics/analytics.service';

export type Theme = 'dark' | 'light';

/** localStorage key; index.html reads the same key before the first paint. */
export const THEME_STORAGE_KEY = 'theme';

/**
 * Light or dark (DIRECTION.md, Tokens), for the public site and the admin. The inline script in index.html applies
 * the stored choice, or the system preference when there is none, as `data-theme` on <html> before the first
 * paint; this service reads it back and switches it. The server renders the dark default.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(AnalyticsService);
  private readonly current = signal<Theme>(this.applied());

  readonly theme = this.current.asReadonly();

  toggle(): void {
    const to: Theme = this.current() === 'dark' ? 'light' : 'dark';
    this.set(to);
    this.analytics.track('theme_toggled', { to });
  }

  set(theme: Theme): void {
    this.current.set(theme);
    this.document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage blocked: the choice lasts until the page is reloaded.
    }
  }

  private applied(): Theme {
    return this.document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }
}
