import { buildLocalizedRoutes, localizedUrl } from './route-table';

describe('localizedUrl', () => {
  it('puts Polish at the root and English under /en', () => {
    expect(localizedUrl('home', 'pl')).toBe('/');
    expect(localizedUrl('home', 'en')).toBe('/en');
    expect(localizedUrl('projects', 'pl')).toBe('/projekty');
    expect(localizedUrl('projects', 'en')).toBe('/en/projects');
    expect(localizedUrl('privacy', 'pl')).toBe('/polityka-prywatnosci');
  });

  it('fills and encodes parameters', () => {
    expect(localizedUrl('project', 'pl', { slug: 'system-zamowien' })).toBe(
      '/projekty/system-zamowien',
    );
    expect(localizedUrl('project', 'en', { slug: 'a b' })).toBe('/en/projects/a%20b');
  });

  it('refuses to build a URL with a missing parameter', () => {
    expect(() => localizedUrl('project', 'pl')).toThrow(/slug/);
  });
});

describe('buildLocalizedRoutes', () => {
  const loadComponent = () => Promise.resolve(class {});

  it('creates the English tree first, then the Polish tree at the root', () => {
    const routes = buildLocalizedRoutes({ home: { loadComponent }, projects: { loadComponent } });

    expect(routes.map((r) => r.path)).toEqual(['en', '']);
    expect(routes[0].data).toEqual({ lang: 'en' });
    expect(routes[0].children?.map((r) => r.path)).toEqual(['', 'projects']);
    expect(routes[1].children?.map((r) => r.path)).toEqual(['', 'projekty']);
  });

  it('gives every page its language and route key, and matches empty paths fully', () => {
    const [en, pl] = buildLocalizedRoutes({ home: { loadComponent } });

    expect(pl.children?.[0]).toMatchObject({
      path: '',
      pathMatch: 'full',
      data: { lang: 'pl', routeKey: 'home' },
    });
    expect(en.children?.[0].data).toEqual({ lang: 'en', routeKey: 'home' });
  });

  it('leaves out pages that are not implemented and applies the parent config to both roots', () => {
    const resolve = { lang: () => 'pl' };
    const routes = buildLocalizedRoutes({ skills: { loadComponent } }, { resolve });

    expect(routes.every((r) => r.resolve === resolve)).toBe(true);
    expect(routes.flatMap((r) => r.children ?? []).map((r) => r.data?.['routeKey'])).toEqual([
      'skills',
      'skills',
    ]);
  });
});
