import { Component, DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { provideI18n } from '../i18n/i18n.providers';
import { languageResolver } from '../i18n/language.resolver';
import { buildLocalizedRoutes } from '../i18n/route-table';
import { personJsonLd } from './json-ld';
import { SITE_ORIGIN, SeoService } from './seo.service';

@Component({ template: '' })
class StubPage {}

describe('SeoService', () => {
  let seo: SeoService;
  let router: Router;
  let doc: Document;

  const meta = (attr: string) => doc.head.querySelector(`meta[${attr}]`)?.getAttribute('content');
  const link = (selector: string) =>
    doc.head.querySelector(`link${selector}`)?.getAttribute('href');
  /** The per-page JSON-LD that update() owns; the app shell's site-wide WebSite script (data-site) is separate. */
  const pageJsonLd = () => doc.head.querySelectorAll('script[type="application/ld+json"][data-seo]');
  const hreflangs = () =>
    Array.from(doc.head.querySelectorAll('link[rel="alternate"][hreflang]')).map(
      (l) => `${l.getAttribute('hreflang')} ${l.getAttribute('href')}`,
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideI18n(),
        provideRouter(
          buildLocalizedRoutes(
            { home: { component: StubPage }, project: { component: StubPage } },
            { resolve: { lang: languageResolver } },
          ),
        ),
        { provide: SITE_ORIGIN, useValue: 'https://mpospieszynski.pl' },
      ],
    });
    seo = TestBed.inject(SeoService);
    router = TestBed.inject(Router);
    doc = TestBed.inject(DOCUMENT);
    seo.setSiteName('Michał Pospieszyński');
    // As in the app: the shell's site-wide JSON-LD is already in <head> and must not be touched or mistaken for the page's.
    seo.setSiteJsonLd({ '@type': 'WebSite' });
  });

  it('sets tags for a page with an English alternate', async () => {
    await router.navigateByUrl('/projekty/system-zamowien');
    seo.update({
      title: 'System przetwarzania zamówień',
      description: 'Nocne przetwarzanie skrócone z 4 godzin do 25 minut.',
      alternates: { pl: '/projekty/system-zamowien', en: '/en/projects/order-processing-api' },
      image: '/media/cover.webp',
      type: 'article',
    });

    expect(doc.title).toBe('System przetwarzania zamówień – Michał Pospieszyński');
    expect(doc.documentElement.lang).toBe('pl');
    expect(meta('name="description"')).toBe('Nocne przetwarzanie skrócone z 4 godzin do 25 minut.');
    expect(link('[rel="canonical"]')).toBe('https://mpospieszynski.pl/projekty/system-zamowien');
    expect(meta('property="og:type"')).toBe('article');
    expect(meta('property="og:locale"')).toBe('pl_PL');
    expect(meta('property="og:locale:alternate"')).toBe('en_GB');
    expect(meta('property="og:image"')).toBe('https://mpospieszynski.pl/media/cover.webp');
    expect(meta('name="twitter:card"')).toBe('summary_large_image');
    expect(hreflangs()).toEqual([
      'pl https://mpospieszynski.pl/projekty/system-zamowien',
      'en https://mpospieszynski.pl/en/projects/order-processing-api',
      'x-default https://mpospieszynski.pl/projekty/system-zamowien',
    ]);
  });

  it('leaves out the English alternate for a Polish-only page', async () => {
    await router.navigateByUrl('/projekty/raporty-sprzedazy');
    seo.update({ title: 'Raporty sprzedaży', alternates: { pl: '/projekty/raporty-sprzedazy' } });

    expect(hreflangs()).toEqual([
      'pl https://mpospieszynski.pl/projekty/raporty-sprzedazy',
      'x-default https://mpospieszynski.pl/projekty/raporty-sprzedazy',
    ]);
    expect(meta('property="og:locale:alternate"')).toBeUndefined();
    expect(meta('property="og:image"')).toBeUndefined();
    expect(meta('name="twitter:card"')).toBe('summary');
  });

  it('builds both alternates for a static page and uses the English canonical on /en', async () => {
    await router.navigateByUrl('/en');
    seo.update({
      alternates: 'home',
      jsonLd: personJsonLd({ name: 'Michał Pospieszyński', url: 'https://mpospieszynski.pl' }),
    });

    expect(doc.title).toBe('Michał Pospieszyński');
    expect(doc.documentElement.lang).toBe('en');
    expect(link('[rel="canonical"]')).toBe('https://mpospieszynski.pl/en');
    expect(meta('property="og:locale"')).toBe('en_GB');
    expect(hreflangs()).toEqual([
      'pl https://mpospieszynski.pl/',
      'en https://mpospieszynski.pl/en',
      'x-default https://mpospieszynski.pl/',
    ]);
    const jsonLd = JSON.parse(pageJsonLd()[0]?.textContent ?? '{}');
    expect(jsonLd['@type']).toBe('Person');
  });

  it('shortens long descriptions and replaces tags on the next page', async () => {
    await router.navigateByUrl('/');
    seo.update({ title: 'A', description: 'x'.repeat(300), jsonLd: { '@type': 'Thing' } });
    expect(meta('name="description"')?.length).toBe(155);

    seo.update({ title: 'B' });
    expect(meta('name="description"')).toBe('');
    expect(doc.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(pageJsonLd().length).toBe(0);
    // The site-wide script stays.
    expect(doc.head.querySelectorAll('script[type="application/ld+json"][data-site]').length).toBe(1);
  });
});
