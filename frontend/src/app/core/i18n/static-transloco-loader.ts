import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { Observable, from } from 'rxjs';

import { Lang } from './route-table';

const FILES: Record<Lang, () => Promise<{ default: Translation }>> = {
  pl: () => import('../../i18n/pl.json'),
  en: () => import('../../i18n/en.json'),
};

/**
 * Translations are bundled with the app (lazy chunks), never fetched over HTTP,
 * so server rendering has them without a network round trip.
 */
@Injectable({ providedIn: 'root' })
export class StaticTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    const load = FILES[lang as Lang];
    if (!load) {
      throw new Error(`No translation file for "${lang}".`);
    }
    return from(load().then((module) => module.default));
  }
}
