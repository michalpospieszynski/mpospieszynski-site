import { Component, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';

import { ProfileResponse, PublicProfileControllerService } from '../api';
import { ANALYTICS_CONFIG } from '../core/analytics/analytics-config';
import { POSTHOG_LOADER } from '../core/analytics/analytics.service';
import { provideI18n } from '../core/i18n/i18n.providers';
import { languageResolver } from '../core/i18n/language.resolver';
import { buildLocalizedRoutes } from '../core/i18n/route-table';
import { profileResolver } from '../core/profile/profile.store';
import { SITE_ORIGIN } from '../core/seo/seo.service';
import { PublicLayoutComponent } from './public-layout.component';

@Component({ template: '<h1>page</h1>' })
class StubPage {}

const PROFILE: ProfileResponse = {
  lang: 'pl' as ProfileResponse['lang'],
  fullName: 'Jan Kowalski',
  headline: 'Spokojne systemy',
  socialLinks: { github: 'https://github.com/jk', email: 'jan@example.com' },
};

describe('Public layout (app shell)', () => {
  let profile: ProfileResponse;

  function setUp(extra: Provider[] = []) {
    TestBed.configureTestingModule({
      providers: [
        ...extra,
        provideI18n(),
        { provide: SITE_ORIGIN, useValue: 'https://example.test' },
        {
          provide: PublicProfileControllerService,
          useValue: { getPublicProfile: () => of(profile) },
        },
        provideRouter(
          buildLocalizedRoutes(
            {
              home: { component: StubPage },
              projects: { component: StubPage },
              project: { component: StubPage },
              contact: { component: StubPage },
            },
            {
              component: PublicLayoutComponent,
              resolve: { lang: languageResolver, profile: profileResolver },
            },
          ),
        ),
      ],
    });
  }

  async function open(url: string) {
    const harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return { harness, el: harness.fixture.nativeElement as HTMLElement };
  }

  const q = (el: HTMLElement, id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`);

  beforeEach(() => {
    localStorage.clear();
    profile = { ...PROFILE, siteProject: { slug: 'ta-strona', lang: 'pl' as never } };
    setUp();
  });

  it('marks the active tab, also on a case study', async () => {
    const { harness, el } = await open('/en/projects');
    expect(q(el, 'tab-projects')?.getAttribute('aria-current')).toBe('page');
    expect(q(el, 'tab-contact')?.getAttribute('aria-current')).toBeNull();
    expect(q(el, 'tab-projects')?.textContent).toBe('Projects');

    await harness.navigateByUrl('/projekty/system-zamowien');
    harness.detectChanges();
    expect(q(el, 'tab-projects')?.getAttribute('aria-current')).toBe('page');
    expect(q(el, 'tab-projects')?.getAttribute('href')).toBe('/projekty');
  });

  it('switches language to the same page and keeps the query string', async () => {
    const { el } = await open('/projekty?tech=java');
    // One pill, naming the other language.
    expect(q(el, 'switch-pl')).toBeNull();
    const other = q(el, 'switch-en')!;
    expect(other.textContent?.trim()).toBe('EN');
    expect(other.getAttribute('aria-label')).toBe('Switch to English');
    expect(other.getAttribute('href')).toBe('/en/projects?tech=java');
    expect(other.getAttribute('hreflang')).toBe('en');
  });

  it('sends case studies without an English version to the list with a note', async () => {
    const { el } = await open('/projekty/tylko-po-polsku');
    expect(q(el, 'switch-en')?.getAttribute('href')).toBe('/en/projects?notTranslated=1');
  });

  it('switches between the dark and light themes and remembers the choice', async () => {
    document.documentElement.removeAttribute('data-theme');
    const { harness, el } = await open('/');
    const toggle = q(el, 'theme-toggle')!;
    expect(toggle.getAttribute('aria-label')).toBe('Włącz jasny motyw');

    toggle.click();
    harness.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(toggle.getAttribute('aria-label')).toBe('Włącz ciemny motyw');

    toggle.click();
    harness.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('shows the footer with social links and "How this site is built"', async () => {
    const { el } = await open('/');
    const footer = q(el, 'footer')!;
    expect(footer.textContent).toContain('Jan Kowalski');
    expect(footer.querySelector('a[href="mailto:jan@example.com"]')).not.toBeNull();
    expect(q(el, 'how-built')?.getAttribute('href')).toBe('/projekty/ta-strona');
  });

  it('names the brand after the profile: first initial and the rest of the name', async () => {
    profile = { ...PROFILE, fullName: 'Michał Pośpieszyński' };
    const { el } = await open('/');
    expect(q(el, 'brand')?.textContent?.trim()).toBe('M. Pośpieszyński');
  });

  it('keeps a one-word name whole', async () => {
    profile = { ...PROFILE, fullName: 'Studio' };
    const { el } = await open('/');
    expect(q(el, 'brand')?.textContent?.trim()).toBe('Studio');
  });

  it('remembers the language chosen with the pill, both ways', async () => {
    const { harness, el } = await open('/');
    q(el, 'switch-en')!.click();
    expect(localStorage.getItem('lang')).toBe('en');

    await harness.navigateByUrl('/en');
    harness.detectChanges();
    q(el, 'switch-pl')!.click();
    expect(localStorage.getItem('lang')).toBe('pl');
  });

  it('hides "How this site is built" without a site project', async () => {
    profile = { ...PROFILE };
    const { el } = await open('/');
    expect(q(el, 'how-built')).toBeNull();
  });

  describe('cookie banner', () => {
    function withAnalytics() {
      TestBed.resetTestingModule();
      setUp([
        { provide: ANALYTICS_CONFIG, useValue: { key: 'phc_test' } },
        // PostHog itself is never loaded here; AnalyticsService has its own spec.
        { provide: POSTHOG_LOADER, useValue: () => new Promise(() => undefined) },
      ]);
    }

    it('is absent, with no footer link, when analytics is not configured', async () => {
      const { el } = await open('/');
      expect(q(el, 'consent-banner')).toBeNull();
      expect(q(el, 'cookie-settings')).toBeNull();
    });

    it('asks a first-time visitor and stays closed after the choice', async () => {
      withAnalytics();
      const { harness, el } = await open('/');
      expect(q(el, 'consent-banner')?.textContent).toContain('Akceptuję');
      expect(q(el, 'consent-banner')?.querySelector('a')?.getAttribute('href')).toBe('/polityka-prywatnosci');

      q(el, 'consent-reject')!.querySelector('button')!.click();
      harness.detectChanges();
      expect(q(el, 'consent-banner')).toBeNull();
      expect(JSON.parse(localStorage.getItem('consent')!).choice).toBe('rejected');
    });

    it('reopens from the footer showing the current choice', async () => {
      withAnalytics();
      const { harness, el } = await open('/en');
      q(el, 'consent-accept')!.querySelector('button')!.click();
      harness.detectChanges();

      q(el, 'cookie-settings')!.click();
      harness.detectChanges();
      expect(q(el, 'consent-current')?.textContent).toContain('consent given');
    });
  });

  describe('language hint', () => {
    function prefer(...languages: string[]) {
      Object.defineProperty(navigator, 'languages', { value: languages, configurable: true });
    }

    afterEach(() => {
      delete (navigator as unknown as Record<string, unknown>)['languages'];
    });

    it('appears on Polish pages for English-first browsers and stays dismissed', async () => {
      prefer('en-GB', 'pl');
      const { harness, el } = await open('/projekty?tech=java');
      expect(q(el, 'lang-hint')?.getAttribute('lang')).toBe('en');
      expect(q(el, 'lang-hint-switch')?.getAttribute('href')).toBe('/en/projects?tech=java');

      q(el, 'lang-hint-dismiss')!.click();
      harness.detectChanges();
      expect(q(el, 'lang-hint')).toBeNull();
      expect(localStorage.getItem('langHintDismissed')).toBe('1');
    });

    it('appears for any browser whose first language is not Polish', async () => {
      prefer('de-DE', 'pl');
      const { el } = await open('/');
      expect(q(el, 'lang-hint')).not.toBeNull();
    });

    it('remembers English when "Switch to English" is used', async () => {
      prefer('en-GB');
      const { el } = await open('/');
      q(el, 'lang-hint-switch')!.click();
      expect(localStorage.getItem('lang')).toBe('en');
    });

    it('stays hidden for Polish-first browsers', async () => {
      prefer('pl-PL', 'en');
      const { el } = await open('/');
      expect(q(el, 'lang-hint')).toBeNull();
    });

    it('stays hidden on English pages', async () => {
      prefer('en-US');
      const { el } = await open('/en');
      expect(q(el, 'lang-hint')).toBeNull();
    });
  });
});
