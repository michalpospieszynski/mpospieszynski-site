import { DOCUMENT, Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

import { LanguageService } from '../i18n/language.service';
import { DEFAULT_LANG, LANGS, Lang, RouteKey, localizedUrl } from '../i18n/route-table';

/** Public origin for canonical and hreflang URLs, e.g. https://mpospieszynski.pl (see app configs). */
export const SITE_ORIGIN = new InjectionToken<string>('SITE_ORIGIN');

export interface SeoData {
  /** Page title without the site name; the service adds " – <site name>". Omit on Home to use the site name alone. */
  title?: string;
  /** The whole <title>, used as is (Home: "Name – headline"). Overrides `title`. */
  fullTitle?: string;
  description?: string;
  /** Paths per language (content pages), or the route key of a static page that exists in both languages. */
  alternates?: Partial<Record<Lang, string>> | RouteKey;
  /** Absolute or site-relative image URL for link previews. */
  image?: string;
  type?: 'website' | 'article';
  jsonLd?: object | object[];
  /** Error pages: `robots: noindex`, and no canonical, og:url or hreflang. */
  noindex?: boolean;
  /** Robots directive for pages that keep their canonical, e.g. `noindex, follow` on filtered lists. */
  robots?: string;
}

const OG_LOCALE: Record<Lang, string> = { pl: 'pl_PL', en: 'en_GB' };
const DESCRIPTION_MAX = 155;

/**
 * Per-page head tags (docs/CONVENTIONS.md, SEO): title, description, canonical, Open Graph, Twitter,
 * hreflang alternates (x-default → Polish), <html lang> and JSON-LD. Works during SSR.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly titleService = inject(Title);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly origin = inject(SITE_ORIGIN);

  private siteName = 'mpospieszynski.pl';
  private readonly currentAlternates = signal<Partial<Record<Lang, string>>>({});

  /** The current page's language versions, read by the language switcher (cleared on every navigation). */
  readonly alternates = this.currentAlternates.asReadonly();

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe(() => this.currentAlternates.set({}));
  }

  /** The owner's name from the profile, used as the title suffix. */
  setSiteName(name: string): void {
    if (name.trim()) {
      this.siteName = name.trim();
    }
  }

  update(data: SeoData): void {
    const lang = this.language.lang();
    const alternates = data.noindex ? {} : this.resolveAlternates(data.alternates);
    this.currentAlternates.set(alternates);
    const path = alternates[lang] ?? this.router.url.split(/[?#]/)[0];
    const url = this.absolute(path);
    const title = data.fullTitle ?? (data.title ? `${data.title} – ${this.siteName}` : this.siteName);
    const description = truncate(data.description ?? '');

    this.document.documentElement.lang = lang;
    this.titleService.setTitle(title);
    this.setName('description', description);
    if (data.noindex) {
      this.setName('robots', 'noindex');
      this.document.head.querySelectorAll('link[rel="canonical"]').forEach((link) => link.remove());
      this.meta.removeTag('property="og:url"');
    } else {
      if (data.robots) {
        this.setName('robots', data.robots);
      } else {
        this.meta.removeTag('name="robots"');
      }
      this.setLink('canonical', url);
    }

    this.setProperty('og:title', title);
    this.setProperty('og:description', description);
    this.setProperty('og:type', data.type ?? 'website');
    if (!data.noindex) {
      this.setProperty('og:url', url);
    }
    this.setProperty('og:site_name', this.siteName);
    this.setProperty('og:locale', OG_LOCALE[lang]);
    const otherLocales = LANGS.filter((l) => l !== lang && alternates[l]).map((l) => OG_LOCALE[l]);
    this.meta
      .getTags('property="og:locale:alternate"')
      .forEach((tag) => this.meta.removeTagElement(tag));
    otherLocales.forEach((locale) =>
      this.meta.addTag({ property: 'og:locale:alternate', content: locale }),
    );
    this.setName('twitter:card', data.image ? 'summary_large_image' : 'summary');
    this.setName('twitter:title', title);
    this.setName('twitter:description', description);
    if (data.image) {
      this.setProperty('og:image', this.absolute(data.image));
      this.setName('twitter:image', this.absolute(data.image));
    } else {
      this.meta.removeTag('property="og:image"');
      this.meta.removeTag('name="twitter:image"');
    }

    this.setHreflang(alternates);
    this.setJsonLd(data.jsonLd);
  }

  private resolveAlternates(alternates: SeoData['alternates']): Partial<Record<Lang, string>> {
    if (typeof alternates === 'string') {
      return Object.fromEntries(LANGS.map((l) => [l, localizedUrl(alternates, l)]));
    }
    return alternates ?? {};
  }

  private setHreflang(alternates: Partial<Record<Lang, string>>): void {
    this.document.head
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .forEach((link) => link.remove());
    for (const lang of LANGS) {
      const path = alternates[lang];
      if (path) {
        this.appendLink({ rel: 'alternate', hreflang: lang, href: this.absolute(path) });
      }
    }
    const fallback = alternates[DEFAULT_LANG];
    if (fallback) {
      this.appendLink({ rel: 'alternate', hreflang: 'x-default', href: this.absolute(fallback) });
    }
  }

  /** Site-wide JSON-LD (WebSite), set by the app shell; kept apart from the per-page script. */
  setSiteJsonLd(jsonLd: object): void {
    this.writeJsonLd('data-site', jsonLd);
  }

  private setJsonLd(jsonLd: SeoData['jsonLd']): void {
    this.writeJsonLd('data-seo', jsonLd);
  }

  private writeJsonLd(marker: string, jsonLd: SeoData['jsonLd']): void {
    this.document.head
      .querySelectorAll(`script[type="application/ld+json"][${marker}]`)
      .forEach((s) => s.remove());
    if (!jsonLd) {
      return;
    }
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(marker, '');
    // "<" is escaped so content can never close the script element.
    script.textContent = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
    this.document.head.appendChild(script);
  }

  private setName(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private setProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content });
  }

  private setLink(rel: string, href: string): void {
    this.document.head.querySelectorAll(`link[rel="${rel}"]`).forEach((link) => link.remove());
    this.appendLink({ rel, href });
  }

  private appendLink(attributes: Record<string, string>): void {
    const link = this.document.createElement('link');
    Object.entries(attributes).forEach(([name, value]) => link.setAttribute(name, value));
    this.document.head.appendChild(link);
  }

  private absolute(pathOrUrl: string): string {
    return /^https?:\/\//.test(pathOrUrl)
      ? pathOrUrl
      : new URL(pathOrUrl, this.origin + '/').toString();
  }
}

function truncate(text: string): string {
  const plain = text.replace(/\s+/g, ' ').trim();
  return plain.length <= DESCRIPTION_MAX
    ? plain
    : `${plain.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`;
}
