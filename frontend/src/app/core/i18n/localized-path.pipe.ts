import { Pipe, PipeTransform, inject } from '@angular/core';

import { LanguageService } from './language.service';
import { Lang, RouteKey, RouteParams } from './route-table';

/**
 * `<a [routerLink]="'projects' | localizedPath">` or `'project' | localizedPath: { slug }`.
 * Impure because the result depends on the current language, not only on the inputs.
 */
@Pipe({ name: 'localizedPath', pure: false })
export class LocalizedPathPipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(routeKey: RouteKey, params: RouteParams = {}, lang?: Lang): string {
    return this.language.path(routeKey, params, lang);
  }
}
