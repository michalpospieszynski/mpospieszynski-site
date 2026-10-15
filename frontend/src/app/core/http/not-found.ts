import { inject } from '@angular/core';
import { RedirectCommand, Router } from '@angular/router';
import { Observable, OperatorFunction, catchError, of, throwError } from 'rxjs';

import { DEFAULT_LANG, Lang, NOT_FOUND_PATH } from '../i18n/route-table';
import { ApiError } from './api-error';

/**
 * Shows the not-found page in `lang` without changing the URL (docs/screens/public/10-not-found.md).
 * Return it from a resolver; call it in the resolver's injection context.
 */
export function notFoundRedirect(lang: Lang): RedirectCommand {
  const prefix = lang === DEFAULT_LANG ? '' : `/${lang}`;
  return new RedirectCommand(inject(Router).parseUrl(`${prefix}/${NOT_FOUND_PATH}`), {
    skipLocationChange: true,
  });
}

/**
 * For resolvers: an API 404 becomes the not-found page; other errors pass through.
 * `resolve: () => api.getX(...).pipe(orNotFound(lang))`
 */
export function orNotFound<T>(lang: Lang): OperatorFunction<T, T | RedirectCommand> {
  const redirect = notFoundRedirect(lang);
  return (source: Observable<T>) =>
    source.pipe(
      catchError((error: unknown) =>
        error instanceof ApiError && error.status === 404 ? of(redirect) : throwError(() => error),
      ),
    );
}
