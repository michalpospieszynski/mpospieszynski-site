import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

const THEME_HREF = 'admin.css';

/**
 * Links the admin Material theme (src/styles/admin.scss, a non-injected bundle) before the first admin screen
 * renders, so public pages never download it and admin pages never flash unstyled.
 */
export const adminThemeResolver: ResolveFn<boolean> = () => {
  const document = inject(DOCUMENT);
  if (document.querySelector(`link[href="${THEME_HREF}"]`)) return true;
  return new Promise<boolean>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = THEME_HREF;
    link.onload = () => resolve(true);
    // A missing theme leaves the admin usable with browser defaults; never block navigation on it.
    link.onerror = () => resolve(true);
    document.head.appendChild(link);
  });
};
