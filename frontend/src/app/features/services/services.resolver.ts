import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { PublicServicesControllerService, ServicesResponse } from '../../api';
import { LocalizedRouteData } from '../../core/i18n/route-table';

/** Active offerings and the FAQ in the route's language. */
export const servicesResolver: ResolveFn<ServicesResponse> = (route) =>
  inject(PublicServicesControllerService).getPublicServices({
    lang: (route.data as LocalizedRouteData).lang,
  });
