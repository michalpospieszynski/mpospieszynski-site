import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { LanguageService } from './language.service';
import { DEFAULT_LANG, Lang } from './route-table';

/** Runs on each language root, so SSR renders the first page with the right language and translations. */
export const languageResolver: ResolveFn<Lang> = (route) =>
  inject(LanguageService).use((route.data['lang'] as Lang | undefined) ?? DEFAULT_LANG);
