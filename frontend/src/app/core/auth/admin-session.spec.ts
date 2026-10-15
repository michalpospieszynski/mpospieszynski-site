import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { AdminSession, AdminTokenSource, adminAuthInterceptor } from './admin-session';

describe('adminAuthInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let source: AdminTokenSource & { expiredCalls: number; refreshes: number; next: string | null };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([adminAuthInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    source = {
      expiredCalls: 0,
      refreshes: 0,
      next: 'fresh',
      accessToken: async () => 'old',
      refresh: async () => {
        source.refreshes++;
        return source.next;
      },
      expired: () => source.expiredCalls++,
    };
    TestBed.inject(AdminSession).connect(source);
  });

  /** HttpClient sends after the token promise resolves. */
  const tick = () => new Promise((resolve) => setTimeout(resolve));

  it('adds the bearer token to admin calls only', async () => {
    const admin = firstValueFrom(http.get('/api/v1/admin/projects'));
    const pub = firstValueFrom(http.get('/api/v1/public/profile'));
    await tick();
    const adminReq = backend.expectOne('/api/v1/admin/projects');
    expect(adminReq.request.headers.get('Authorization')).toBe('Bearer old');
    const publicReq = backend.expectOne('/api/v1/public/profile');
    expect(publicReq.request.headers.has('Authorization')).toBe(false);
    adminReq.flush([]);
    publicReq.flush({});
    await Promise.all([admin, pub]);
  });

  it("sends the admin's language with admin calls only", async () => {
    TestBed.inject(AdminSession).language.set('en');
    const admin = firstValueFrom(http.get('/api/v1/admin/projects'));
    const pub = firstValueFrom(http.get('/api/v1/public/profile'));
    await tick();
    const adminReq = backend.expectOne('/api/v1/admin/projects');
    expect(adminReq.request.headers.get('Accept-Language')).toBe('en');
    const publicReq = backend.expectOne('/api/v1/public/profile');
    expect(publicReq.request.headers.has('Accept-Language')).toBe(false);
    adminReq.flush([]);
    publicReq.flush({});
    await Promise.all([admin, pub]);
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    const result = firstValueFrom(http.get('/api/v1/admin/projects'));
    await tick();
    backend
      .expectOne('/api/v1/admin/projects')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await tick();
    const retry = backend.expectOne('/api/v1/admin/projects');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer fresh');
    retry.flush(['ok']);
    expect(await result).toEqual(['ok']);
    expect(source.refreshes).toBe(1);
    expect(source.expiredCalls).toBe(0);
  });

  it('signs out when the retry is refused too', async () => {
    const result = firstValueFrom(http.get('/api/v1/admin/projects')).catch((e: unknown) => e);
    await tick();
    backend
      .expectOne('/api/v1/admin/projects')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await tick();
    backend
      .expectOne('/api/v1/admin/projects')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await result;
    expect(source.refreshes).toBe(1);
    expect(source.expiredCalls).toBe(1);
  });

  it('signs out without a retry when the refresh fails', async () => {
    source.next = null;
    const result = firstValueFrom(http.get('/api/v1/admin/projects')).catch((e: unknown) => e);
    await tick();
    backend
      .expectOne('/api/v1/admin/projects')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await result;
    backend.expectNone('/api/v1/admin/projects');
    expect(source.expiredCalls).toBe(1);
  });

  it('passes other errors through untouched', async () => {
    const result = firstValueFrom(http.get('/api/v1/admin/projects')).catch((e: unknown) => e);
    await tick();
    backend
      .expectOne('/api/v1/admin/projects')
      .flush(null, { status: 409, statusText: 'Conflict' });
    expect(((await result) as { status: number }).status).toBe(409);
    expect(source.refreshes).toBe(0);
  });
});
