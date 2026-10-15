import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn } from '@angular/router';

import { ProjectDetail, PublicProjectsControllerService } from '../../api';
import { orNotFound } from '../../core/http/not-found';
import { LocalizedRouteData } from '../../core/i18n/route-table';

/** The case study for `:slug` in the route's language; an API 404 shows the not-found page and keeps the URL. */
export const projectResolver: ResolveFn<ProjectDetail | RedirectCommand> = (route) => {
  const lang = (route.data as LocalizedRouteData).lang;
  return inject(PublicProjectsControllerService)
    .getPublicProject({ slug: route.paramMap.get('slug') ?? '', lang })
    .pipe(orNotFound(lang));
};
