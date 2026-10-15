import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localePl from '@angular/common/locales/pl';
import { EnvironmentProviders, isDevMode } from '@angular/core';
import { provideTransloco, provideTranslocoTranspiler } from '@jsverse/transloco';

import { IcuTranspiler } from './icu-transpiler';
import { DEFAULT_LANG, LANGS } from './route-table';
import { StaticTranslocoLoader } from './static-transloco-loader';

// Dates and numbers follow the page language: "październik 2026", decimal comma, space as thousands separator.
registerLocaleData(localePl, 'pl');
registerLocaleData(localeEn, 'en');

/** Transloco with bundled pl/en files and ICU plurals (Polish has one/few/many). */
export function provideI18n(): EnvironmentProviders[] {
  return [
    ...provideTransloco({
      config: {
        availableLangs: [...LANGS],
        defaultLang: DEFAULT_LANG,
        fallbackLang: DEFAULT_LANG,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: { logMissingKey: true, useFallbackTranslation: false },
      },
      loader: StaticTranslocoLoader,
    }),
    // ICU plural/select without @messageformat/core (no runtime code generation, so no 'unsafe-eval' in the CSP).
    provideTranslocoTranspiler(IcuTranspiler),
  ];
}
