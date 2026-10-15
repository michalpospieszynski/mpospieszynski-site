import { DOCUMENT, inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Translation, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { AdminSession } from '../../../core/auth/admin-session';
import adminEn from './admin.en.json';
import adminPl from './admin.pl.json';

export type AdminLang = 'pl' | 'en';

const TEXTS: Record<AdminLang, Translation> = { pl: adminPl, en: adminEn };
const STORAGE_KEY = 'adminLang';
const LOCALES: Record<AdminLang, string> = { pl: 'pl-PL', en: 'en-GB' };

/** The admin's language as last applied, for plain formatting helpers outside DI (shared/editing.ts). */
let current: AdminLang = 'pl';

/** BCP 47 locale for dates and numbers in the admin: "14.10.2026" or "14/10/2026". */
export function adminLocale(): string {
  return LOCALES[current];
}

/**
 * The admin speaks Polish or English (docs/screens/admin/01-admin-shell.md), chosen in its top bar and kept in
 * localStorage. Its texts are bundled with the lazy admin chunk, so the public site never downloads them, and the
 * chosen language's file is merged under `admin.*` into both site languages: the project preview may switch the
 * active language to the previewed one while the banner stays in the admin's language.
 */
export const adminI18nResolver: ResolveFn<boolean> = async () => {
  // inject() only works before the first await.
  const transloco = inject(TranslocoService);
  const session = inject(AdminSession);
  const document = inject(DOCUMENT);
  for (const lang of ['pl', 'en']) {
    await firstValueFrom(transloco.load(lang));
  }
  applyAdminLang(storedAdminLang(), transloco, session, document);
  return true;
};

/** Switches the admin's language now and for later visits. */
export function setAdminLang(
  lang: AdminLang,
  transloco: TranslocoService,
  session: AdminSession,
  document: Document,
): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage blocked: the choice lasts until the page is reloaded.
  }
  applyAdminLang(lang, transloco, session, document);
}

/** The admin's language is the active one outside the preview; this puts it back after a preview. */
export function restoreAdminLang(transloco: TranslocoService, session: AdminSession): void {
  transloco.setActiveLang(session.language());
}

function applyAdminLang(
  lang: AdminLang,
  transloco: TranslocoService,
  session: AdminSession,
  document: Document,
): void {
  for (const target of ['pl', 'en']) {
    transloco.setTranslation(TEXTS[lang], target, { merge: true });
  }
  current = lang;
  session.language.set(lang);
  // The active language follows the admin's; changing it re-renders every translated text.
  transloco.setActiveLang(lang);
  document.documentElement.lang = lang;
}

function storedAdminLang(): AdminLang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'pl';
  } catch {
    return 'pl';
  }
}
