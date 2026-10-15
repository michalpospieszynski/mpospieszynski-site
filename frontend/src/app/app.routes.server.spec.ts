import { RenderMode } from '@angular/ssr';

import { serverRoutes } from './app.routes.server';

describe('serverRoutes', () => {
  const modeOf = (path: string) => serverRoutes.find((r) => r.path === path)?.renderMode;

  it('renders the admin only in the browser', () => {
    expect(modeOf('admin')).toBe(RenderMode.Client);
    expect(modeOf('admin/**')).toBe(RenderMode.Client);
  });

  it('server-renders every other route, after the admin entries', () => {
    expect(modeOf('**')).toBe(RenderMode.Server);
    expect(serverRoutes.at(-1)?.path).toBe('**');
  });
});
