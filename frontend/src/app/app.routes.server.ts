import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // The admin is a client-only app: SSR never runs admin code.
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  // Public pages are rendered on every request, in both languages.
  { path: '**', renderMode: RenderMode.Server },
];
