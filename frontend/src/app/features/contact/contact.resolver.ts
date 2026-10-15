import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';

import { PublicProjectsControllerService, PublicServicesControllerService } from '../../api';
import { LocalizedRouteData } from '../../core/i18n/route-table';

export type ContactTopic = 'PROJECT' | 'CONSULTATION' | 'OTHER';
export const CONTACT_TOPICS: readonly ContactTopic[] = ['PROJECT', 'CONSULTATION', 'OTHER'];

export interface ContactPageData {
  services: { id: string; title: string }[];
  /** Prefill from `?topic=&service=&project=`; unknown values are dropped. */
  topic: ContactTopic;
  serviceId: string | null;
  projectTitle: string | null;
}

/** Service options and the prefill from the query (docs/screens/public/08-contact.md, Behaviour). */
export const contactResolver: ResolveFn<ContactPageData> = (route) => {
  const lang = (route.data as LocalizedRouteData).lang;
  const query = route.queryParamMap;
  const slug = query.get('project');
  const project$ = slug
    ? inject(PublicProjectsControllerService)
        .getPublicProject({ slug, lang })
        .pipe(
          map((p) => p.title ?? null),
          catchError(() => of(null)),
        )
    : of(null);

  return forkJoin({
    services: inject(PublicServicesControllerService).getPublicServices({ lang }),
    projectTitle: project$,
  }).pipe(
    map(({ services, projectTitle }) => {
      const options = (services.services ?? []).map((s) => ({
        id: s.id ?? '',
        title: s.title ?? '',
      }));
      const requested = query.get('service');
      return {
        services: options,
        topic: CONTACT_TOPICS.find((t) => t === query.get('topic')) ?? 'PROJECT',
        serviceId: options.some((s) => s.id === requested) ? requested : null,
        projectTitle,
      };
    }),
  );
};
