import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ResolveFn, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { provideI18n } from '../i18n/i18n.providers';
import { languageResolver } from '../i18n/language.resolver';
import { Lang, LocalizedRouteData, buildLocalizedRoutes } from '../i18n/route-table';
import { ApiError } from './api-error';
import { orNotFound } from './not-found';

@Component({ template: '<p id="page">project</p>' })
class ProjectStub {}

@Component({ template: '<p id="not-found">not found</p>' })
class NotFoundStub {}

/** Like a real content resolver: unknown slugs 404 at the API, a broken API answers 500. */
const projectResolver: ResolveFn<string> = (route) => {
  const slug = route.paramMap.get('slug');
  const lang = (route.data as LocalizedRouteData).lang as Lang;
  const response =
    slug === 'known'
      ? of('ok')
      : throwError(() => new ApiError(slug === 'broken' ? 500 : 404, 'Error', ''));
  return response.pipe(orNotFound(lang));
};

describe('orNotFound', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideI18n(),
        provideRouter(
          buildLocalizedRoutes(
            { project: { component: ProjectStub, resolve: { project: projectResolver } } },
            { resolve: { lang: languageResolver } },
            { component: NotFoundStub },
          ),
        ),
      ],
    });
  });

  it('renders the page when the API has it', async () => {
    const harness = await RouterTestingHarness.create('/projekty/known');
    expect(harness.routeNativeElement?.querySelector('#page')).not.toBeNull();
  });

  it('shows the not-found page in the same language and keeps the URL on an API 404', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/en/projects/missing');
    expect(harness.routeNativeElement?.querySelector('#not-found')).not.toBeNull();
    // The router renders /en/404 internally; the address bar is never moved there.
    expect(TestBed.inject(Location).path()).not.toContain('404');
    expect(document.documentElement.lang).toBe('en');
  });

  it('lets other errors through', async () => {
    const harness = await RouterTestingHarness.create();
    await expect(harness.navigateByUrl('/projekty/broken')).rejects.toBeInstanceOf(ApiError);
  });
});
