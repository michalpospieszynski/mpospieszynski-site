import { Routes } from '@angular/router';

import { adminGuard } from './auth/admin.guard';
import { adminI18nResolver } from './i18n/admin-i18n';
import { unsavedChangesGuard } from './shared/editing';
import { AdminShellComponent } from './shell/admin-shell.component';
import { adminThemeResolver } from './shell/admin-theme';

/**
 * /admin/** (docs/screens/admin/). Client-rendered only (app.routes.server.ts). Paths are Polish and fixed:
 * the admin has one language, so it is not part of the localised route table.
 */
const routes: Routes = [
  {
    path: '',
    resolve: { i18n: adminI18nResolver, theme: adminThemeResolver },
    children: [
      {
        path: 'logowanie',
        loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
      },
      {
        // The preview has its own minimal frame, outside the shell.
        path: 'projekty/:id/podglad',
        canMatch: [adminGuard],
        loadComponent: () =>
          import('./projects/project-preview.page').then((m) => m.ProjectPreviewPage),
      },
      {
        path: '',
        canMatch: [adminGuard],
        component: AdminShellComponent,
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./dashboard/dashboard.page').then((m) => m.DashboardPage),
          },
          {
            path: 'wiadomosci',
            loadComponent: () => import('./messages/messages.page').then((m) => m.MessagesPage),
            children: [
              {
                path: ':id',
                loadComponent: () =>
                  import('./messages/message-detail.component').then(
                    (m) => m.MessageDetailComponent,
                  ),
              },
            ],
          },
          {
            path: 'projekty',
            loadComponent: () =>
              import('./projects/projects-list.page').then((m) => m.ProjectsListPage),
          },
          {
            path: 'projekty/nowy',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./projects/project-editor.page').then((m) => m.ProjectEditorPage),
          },
          {
            path: 'projekty/:id',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./projects/project-editor.page').then((m) => m.ProjectEditorPage),
          },
          {
            path: 'umiejetnosci',
            loadComponent: () => import('./skills/skills.page').then((m) => m.SkillsPage),
          },
          {
            path: 'uslugi',
            loadComponent: () => import('./services/services.page').then((m) => m.ServicesPage),
          },
          {
            path: 'pliki',
            loadComponent: () => import('./media/media.page').then((m) => m.MediaPage),
          },
          {
            path: 'ustawienia',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () => import('./settings/settings.page').then((m) => m.SettingsPage),
          },
          { path: '**', redirectTo: '' },
        ],
      },
    ],
  },
];

export default routes;
