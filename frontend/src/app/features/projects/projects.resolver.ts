import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { map, switchMap } from 'rxjs';

import { PublicProjectsControllerService, PublicTechnologiesControllerService } from '../../api';
import { Lang, LocalizedRouteData } from '../../core/i18n/route-table';
import { PROJECT_KINDS, ProjectKind, ProjectView, toProjectView } from './project-view';

export interface ProjectsPageData {
  lang: Lang;
  projects: ProjectView[];
  technologies: { slug: string; name: string }[];
  /** Active filters; unknown values from the URL are dropped (treated as no filter). */
  kind: ProjectKind | null;
  tech: string | null;
  notTranslated: boolean;
}

/** Projects and the technology options for `/projekty?kind=&tech=` (re-runs when the query changes). */
export const projectsResolver: ResolveFn<ProjectsPageData> = (route) => {
  const lang = (route.data as LocalizedRouteData).lang;
  const query = route.queryParamMap;
  const kind = PROJECT_KINDS.find((k) => k === query.get('kind')) ?? null;
  const requestedTech = query.get('tech')?.trim() || null;

  const projectsApi = inject(PublicProjectsControllerService);

  // Options first: a slug that no published project uses is not a filter, so it is never sent.
  return inject(PublicTechnologiesControllerService)
    .listPublicTechnologies({ lang })
    .pipe(
      map((technologies) => technologies.map((t) => ({ slug: t.slug ?? '', name: t.name ?? '' }))),
      switchMap((options) => {
        const tech = options.some((t) => t.slug === requestedTech) ? requestedTech : null;
        return projectsApi
          .listPublicProjects({ lang, kind: kind ?? undefined, tech: tech ?? undefined })
          .pipe(
            map((projects): ProjectsPageData => ({
              lang,
              projects: projects.map((item) => toProjectView(item, lang)),
              technologies: options,
              kind,
              tech,
              notTranslated: lang !== 'pl' && query.get('notTranslated') === '1',
            })),
          );
      }),
    );
};
