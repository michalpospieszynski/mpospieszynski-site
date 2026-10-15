import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { forkJoin, map } from 'rxjs';

import {
  ProfileResponse,
  ProjectListItem,
  PublicProjectsControllerService,
  PublicServicesControllerService,
  ServiceOffering,
} from '../../api';
import { LocalizedRouteData } from '../../core/i18n/route-table';
import { ProfileStore } from '../../core/profile/profile.store';

export interface HomeData {
  profile: ProfileResponse;
  /** Every published project, in the owner's order: the graph, the chips and the projects band. */
  projects: ProjectListItem[];
  services: ServiceOffering[];
}

/** Profile (shared with the shell), projects and services, in parallel (docs/screens/public/02-home.md). */
export const homeResolver: ResolveFn<HomeData> = (route) => {
  const lang = (route.data as LocalizedRouteData).lang;
  return forkJoin({
    profile: inject(ProfileStore).load(lang),
    projects: inject(PublicProjectsControllerService).listPublicProjects({ lang }),
    services: inject(PublicServicesControllerService)
      .getPublicServices({ lang })
      .pipe(map((response) => response.services ?? [])),
  });
};
