import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { provideI18n } from './i18n.providers';
import { languageResolver } from './language.resolver';
import { LanguageService } from './language.service';
import { buildLocalizedRoutes } from './route-table';

@Component({ template: '' })
class StubPage {}

describe('LanguageService', () => {
  let router: Router;
  let language: LanguageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideI18n(),
        provideRouter(
          buildLocalizedRoutes(
            {
              home: { component: StubPage },
              projects: { component: StubPage },
              project: { component: StubPage },
            },
            { resolve: { lang: languageResolver } },
          ),
        ),
      ],
    });
    router = TestBed.inject(Router);
    language = TestBed.inject(LanguageService);
  });

  it('takes the language from the URL and sets <html lang> and translations', async () => {
    await router.navigateByUrl('/en/projects');
    expect(language.lang()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(TestBed.inject(TranslocoService).translate('nav.projects')).toBe('Projects');

    await router.navigateByUrl('/projekty');
    expect(language.lang()).toBe('pl');
    expect(document.documentElement.lang).toBe('pl');
    expect(TestBed.inject(TranslocoService).translate('nav.projects')).toBe('Projekty');
  });

  it('builds paths in the current or a given language', async () => {
    await router.navigateByUrl('/en');
    expect(language.path('projects')).toBe('/en/projects');
    expect(language.path('projects', {}, 'pl')).toBe('/projekty');
  });

  it('switches to the equivalent page and keeps the query string', async () => {
    await router.navigateByUrl('/projekty?tech=java&kind=CLIENT');
    expect(language.switchUrl()).toBe('/en/projects?tech=java&kind=CLIENT');

    await router.navigateByUrl('/en');
    expect(language.switchUrl()).toBe('/');
  });

  it('uses the alternate of a case study, or falls back to the projects list', async () => {
    await router.navigateByUrl('/projekty/system-zamowien');
    expect(language.switchUrl({ en: '/en/projects/order-processing-api' })).toBe(
      '/en/projects/order-processing-api',
    );
    expect(language.switchUrl()).toBe('/en/projects?notTranslated=1');
  });

  it('remembers that the language hint was dismissed', () => {
    expect(language.isLangHintDismissed()).toBe(false);
    language.dismissLangHint();
    expect(language.isLangHintDismissed()).toBe(true);
  });
});

describe('Polish plurals', () => {
  it('use one / few / many forms through MessageFormat', async () => {
    TestBed.configureTestingModule({ providers: [provideI18n()] });
    const transloco = TestBed.inject(TranslocoService);
    await firstValueFrom(transloco.load('pl'));
    transloco.setActiveLang('pl');

    const projects = (count: number) => transloco.translate('skills.tech.projects', { count });
    expect([1, 2, 5, 22, 25].map(projects)).toEqual([
      '1 projekt',
      '2 projekty',
      '5 projektów',
      '22 projekty',
      '25 projektów',
    ]);

    await firstValueFrom(transloco.load('en'));
    transloco.setActiveLang('en');
    expect([1, 2].map(projects)).toEqual(['1 project', '2 projects']);
  });
});
