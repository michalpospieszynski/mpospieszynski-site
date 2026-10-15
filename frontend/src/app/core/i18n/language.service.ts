import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { Observable, filter, map } from 'rxjs';

import {
  DEFAULT_LANG,
  LANGS,
  Lang,
  LocalizedRouteData,
  RouteKey,
  RouteParams,
  localizedUrl,
} from './route-table';

const HINT_DISMISSED_KEY = 'langHintDismissed';

/**
 * The page language comes from the URL (route data), never from the browser setting.
 * `use()` is called by the language resolver on each language root, so the right
 * translations and <html lang> are in place before the first (server) render.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  private readonly currentLang = signal<Lang>(DEFAULT_LANG);
  private readonly currentPage = signal<{
    routeKey: RouteKey;
    params: RouteParams;
    query: string;
  } | null>(null);

  readonly lang = this.currentLang.asReadonly();
  readonly page = this.currentPage.asReadonly();

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      const leaf = deepest(this.router.routerState.snapshot.root);
      const data = leaf.data as Partial<LocalizedRouteData>;
      const query = new URLSearchParams(
        Object.entries(leaf.queryParams).flatMap(([k, v]) =>
          (Array.isArray(v) ? v : [v]).map((x) => [k, String(x)]),
        ),
      ).toString();
      this.currentPage.set(
        data.routeKey ? { routeKey: data.routeKey, params: leaf.params, query } : null,
      );
    });
  }

  /** Activates a language: translations, <html lang> and the lang signal. Completes once translations are loaded. */
  use(lang: Lang): Observable<Lang> {
    this.currentLang.set(lang);
    this.document.documentElement.lang = lang;
    this.transloco.setActiveLang(lang);
    return this.transloco.load(lang).pipe(map(() => lang));
  }

  /** URL of a page, in the current language unless another is given. */
  path(routeKey: RouteKey, params: RouteParams = {}, lang: Lang = this.currentLang()): string {
    return localizedUrl(routeKey, lang, params);
  }

  /**
   * Target of the language switcher: the equivalent page in the other language.
   * Static pages map through the route table and keep their query string. Content pages (case studies)
   * pass `alternates` from SeoService; without an alternate the visitor goes to the other language's
   * projects list with `?notTranslated=1`.
   */
  switchUrl(alternates?: Partial<Record<Lang, string>>): string {
    const target = this.otherLang();
    const page = this.currentPage();
    if (!page) {
      return localizedUrl('home', target);
    }
    if (Object.keys(page.params).length > 0) {
      return alternates?.[target] ?? `${localizedUrl('projects', target)}?notTranslated=1`;
    }
    const url = localizedUrl(page.routeKey, target);
    return page.query ? `${url}?${page.query}` : url;
  }

  otherLang(): Lang {
    return LANGS.find((lang) => lang !== this.currentLang()) ?? DEFAULT_LANG;
  }

  isLangHintDismissed(): boolean {
    if (!this.isBrowser) {
      return true;
    }
    try {
      return localStorage.getItem(HINT_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  }

  dismissLangHint(): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(HINT_DISMISSED_KEY, '1');
    } catch {
      // Storage blocked: the hint comes back on the next page load.
    }
  }
}

function deepest(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  return route.firstChild ? deepest(route.firstChild) : route;
}
