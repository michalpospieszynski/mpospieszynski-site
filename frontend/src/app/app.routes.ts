import { Routes } from '@angular/router';

import { languageResolver } from './core/i18n/language.resolver';
import { buildLocalizedRoutes } from './core/i18n/route-table';
import { profileResolver } from './core/profile/profile.store';
import { homeResolver } from './features/home/home.resolver';
import { contactResolver } from './features/contact/contact.resolver';
import { projectResolver } from './features/projects/project.resolver';
import { projectsResolver } from './features/projects/projects.resolver';
import { servicesResolver } from './features/services/services.resolver';
import { skillsResolver } from './features/skills/skills.resolver';
import { PublicLayoutComponent } from './layout/public-layout.component';

declare const ngDevMode: unknown;

// Dev-only routes. Production builds define ngDevMode as false, so this code and its chunks are dropped.
const devRoutes: Routes =
  typeof ngDevMode === 'undefined' || ngDevMode
    ? [
        {
          path: 'dev/style-guide',
          loadComponent: () =>
            import('./features/dev/style-guide.page').then((m) => m.StyleGuidePage),
        },
      ]
    : [];

// Admin and dev routes come first; the localised trees (/en/... and /...) follow.
// The admin is a lazy, client-only app (docs/screens/admin/01-admin-shell.md).
export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes'),
  },
  ...devRoutes,
  ...buildLocalizedRoutes(
    {
      home: {
        loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
        resolve: { data: homeResolver },
      },
      projects: {
        loadComponent: () =>
          import('./features/projects/projects.page').then((m) => m.ProjectsPage),
        resolve: { data: projectsResolver },
        // Filters live in the query string.
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',
      },
      project: {
        loadComponent: () => import('./features/projects/project.page').then((m) => m.ProjectPage),
        resolve: { project: projectResolver },
      },
      skills: {
        loadComponent: () => import('./features/skills/skills.page').then((m) => m.SkillsPage),
        resolve: { skills: skillsResolver },
      },
      services: {
        loadComponent: () =>
          import('./features/services/services.page').then((m) => m.ServicesPage),
        resolve: { services: servicesResolver },
      },
      about: {
        loadComponent: () => import('./features/about/about.page').then((m) => m.AboutPage),
      },
      contact: {
        loadComponent: () => import('./features/contact/contact.page').then((m) => m.ContactPage),
        resolve: { data: contactResolver },
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',
      },
      privacy: {
        loadComponent: () => import('./features/privacy/privacy.page').then((m) => m.PrivacyPage),
      },
    },
    // The shell wraps both language trees; the profile feeds its footer and the site-wide JSON-LD.
    {
      component: PublicLayoutComponent,
      resolve: { lang: languageResolver, profile: profileResolver },
    },
    {
      loadComponent: () =>
        import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
    },
  ),
];
