import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { PublicSkillsControllerService, SkillsResponse } from '../../api';
import { LocalizedRouteData } from '../../core/i18n/route-table';

/** Expertise areas and technologies in the route's language. */
export const skillsResolver: ResolveFn<SkillsResponse> = (route) =>
  inject(PublicSkillsControllerService).getPublicSkills({ lang: (route.data as LocalizedRouteData).lang });
