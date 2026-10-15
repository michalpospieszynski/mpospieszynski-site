import { Route, Routes } from '@angular/router';

export type Lang = 'pl' | 'en';

export const LANGS: readonly Lang[] = ['pl', 'en'];
export const DEFAULT_LANG: Lang = 'pl';

/**
 * Localised slugs per page (docs/ARCHITECTURE.md §6, Routes). Polish lives at the root, English under /en.
 * Never hardcode these paths in templates: use the localizedPath pipe or LanguageService.path().
 */
export const ROUTE_TABLE = {
  home: { pl: '', en: '' },
  projects: { pl: 'projekty', en: 'projects' },
  project: { pl: 'projekty/:slug', en: 'projects/:slug' },
  skills: { pl: 'umiejetnosci', en: 'skills' },
  services: { pl: 'uslugi', en: 'services' },
  about: { pl: 'o-mnie', en: 'about' },
  contact: { pl: 'kontakt', en: 'contact' },
  privacy: { pl: 'polityka-prywatnosci', en: 'privacy' },
} as const satisfies Record<string, Record<Lang, string>>;

export type RouteKey = keyof typeof ROUTE_TABLE;

/**
 * Path that resolvers redirect to on an API 404 (with `skipLocationChange`, so the visitor keeps the URL
 * they typed). Nothing is registered under it: like any unknown path it falls through to `**`.
 */
export const NOT_FOUND_PATH = '404';

export type RouteParams = Readonly<Record<string, string | number>>;

/** Route data on every localised page. */
export interface LocalizedRouteData {
  lang: Lang;
  routeKey: RouteKey;
}

/** What a feature provides for one page; path and data come from the route table. */
export type PageRoute = Omit<Route, 'path' | 'data' | 'children' | 'redirectTo'>;

/** Absolute URL of a page in a language, e.g. ('project', 'en', { slug: 'x' }) -> '/en/projects/x'. */
export function localizedUrl(key: RouteKey, lang: Lang, params: RouteParams = {}): string {
  const segment = ROUTE_TABLE[key][lang].replace(/:(\w+)/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined || value === '') {
      throw new Error(`Route "${key}" needs the parameter "${name}".`);
    }
    return encodeURIComponent(String(value));
  });
  const prefix = lang === DEFAULT_LANG ? '' : `/${lang}`;
  return `${prefix}${segment ? `/${segment}` : ''}` || '/';
}

/**
 * Builds both language trees from the route table: `/en/...` and `/...`, each page with
 * `data: { lang, routeKey }`. Pages a feature hasn't implemented yet are simply left out.
 * `parent` is applied to each language root (the language resolver lives there).
 * `notFound` becomes the last child of each tree (`**`), so unknown paths render it in that tree's language.
 */
export function buildLocalizedRoutes(
  pages: Partial<Record<RouteKey, PageRoute>>,
  parent: Omit<Route, 'path' | 'children'> = {},
  notFound?: PageRoute,
): Routes {
  const tree = (lang: Lang): Route => ({
    ...parent,
    path: lang === DEFAULT_LANG ? '' : lang,
    data: { ...parent.data, lang },
    children: (Object.keys(ROUTE_TABLE) as RouteKey[])
      .filter((key) => pages[key])
      .map((key): Route => ({
        ...pages[key],
        path: ROUTE_TABLE[key][lang],
        ...(ROUTE_TABLE[key][lang] === '' ? { pathMatch: 'full' as const } : {}),
        data: { lang, routeKey: key } satisfies LocalizedRouteData,
      }))
      .concat(notFound ? [{ ...notFound, path: '**', data: { lang } }] : []),
  });
  // English first, so `/en/...` never falls into the Polish tree.
  return LANGS.filter((lang) => lang !== DEFAULT_LANG)
    .map(tree)
    .concat(tree(DEFAULT_LANG));
}
