import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ApiError, apiErrorInterceptor } from './api-error';

describe('apiErrorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  async function failWith(
    body: string | object,
    status: number,
    statusText: string,
  ): Promise<ApiError> {
    const result = firstValueFrom(http.get('/api/v1/public/test'));
    backend.expectOne('/api/v1/public/test').flush(body, { status, statusText });
    return result.then(
      () => {
        throw new Error('expected an error');
      },
      (error: unknown) => error as ApiError,
    );
  }

  it('maps a ProblemDetail with field errors', async () => {
    const error = await failWith(
      {
        title: 'Invalid data',
        detail: 'Please correct the highlighted fields.',
        errors: [{ field: 'email', message: 'Enter a valid email address.' }],
      },
      400,
      'Bad Request',
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.detail).toBe('Please correct the highlighted fields.');
    expect(error.fieldMessage('email')).toBe('Enter a valid email address.');
    expect(error.fieldMessage('name')).toBeUndefined();
  });

  it('maps an error without a ProblemDetail body', async () => {
    const error = await failWith('Bad gateway', 502, 'Bad Gateway');

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
    expect(error.title).toBe('Bad Gateway');
    expect(error.errors).toEqual([]);
  });

  it('passes successful responses through untouched', async () => {
    const result = firstValueFrom(http.get('/api/v1/public/ok'));
    backend.expectOne('/api/v1/public/ok').flush({ ok: true });
    expect(await result).toEqual({ ok: true });
  });
});
