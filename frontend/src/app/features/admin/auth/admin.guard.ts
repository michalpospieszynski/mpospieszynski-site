import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const LOGIN_PATH = '/admin/logowanie';

/**
 * Only admin paths are accepted as a return address (docs/screens/admin/02-login.md): "/admin" or "/admin/…",
 * never "//host", "/administrator" or an absolute URL.
 */
export function safeReturnUrl(value: string | null | undefined): string {
  if (!value || !/^\/admin(?:[/?#]|$)/.test(value) || value.startsWith(LOGIN_PATH)) {
    return '/admin';
  }
  return value;
}

/** Admin routes need a session with `app_metadata.role === 'admin'`; otherwise go to login and come back. */
export const adminGuard: CanMatchFn = async () => {
  const router = inject(Router);
  if (await inject(AuthService).isAdmin()) {
    return true;
  }
  const target = router.currentNavigation()?.extractedUrl;
  const returnUrl = target ? router.serializeUrl(target) : '/admin';
  return router.createUrlTree([LOGIN_PATH], {
    queryParams: { returnUrl: safeReturnUrl(returnUrl) },
  });
};
