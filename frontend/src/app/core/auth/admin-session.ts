import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';

/** What the admin's AuthService plugs in once it has loaded (supabase-js stays out of the public bundle). */
export interface AdminTokenSource {
  accessToken(): Promise<string | null>;
  /** Refreshes the session; resolves to the new token, or null when signed out. */
  refresh(): Promise<string | null>;
  /** Called when a refreshed token is still refused. */
  expired(): void;
}

/** Holder between the root HTTP pipeline and the lazily loaded admin AuthService. */
@Injectable({ providedIn: 'root' })
export class AdminSession {
  private source: AdminTokenSource | null = null;

  /** The admin's UI language, set by the admin (features/admin/i18n); the API answers its messages in it. */
  readonly language = signal<'pl' | 'en'>('pl');

  connect(source: AdminTokenSource): void {
    this.source = source;
  }

  get tokens(): AdminTokenSource | null {
    return this.source;
  }
}

const ADMIN_API = '/api/v1/admin/';

/**
 * Adds `Authorization: Bearer <access token>` and the admin's `Accept-Language` to admin API calls only. On a 401 the session is refreshed once
 * and the call retried; a second 401 signs out (docs/screens/admin/01-admin-shell.md).
 */
export const adminAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes(ADMIN_API)) {
    return next(req);
  }
  const session = inject(AdminSession);
  const source = session.tokens;
  if (!source) {
    return next(req);
  }
  const language = session.language();
  const withToken = (token: string | null): HttpRequest<unknown> =>
    req.clone({
      setHeaders: token
        ? { Authorization: `Bearer ${token}`, 'Accept-Language': language }
        : { 'Accept-Language': language },
    });
  const isUnauthorized = (error: unknown): error is HttpErrorResponse =>
    error instanceof HttpErrorResponse && error.status === 401;

  return from(source.accessToken()).pipe(
    switchMap((token) => next(withToken(token))),
    catchError((error: unknown) => {
      if (!isUnauthorized(error)) {
        return throwError(() => error);
      }
      return from(source.refresh()).pipe(
        switchMap((token) => {
          if (!token) {
            source.expired();
            return throwError(() => error);
          }
          return next(withToken(token)).pipe(
            catchError((retryError: unknown) => {
              if (isUnauthorized(retryError)) {
                source.expired();
              }
              return throwError(() => retryError);
            }),
          );
        }),
      );
    }),
  );
};
