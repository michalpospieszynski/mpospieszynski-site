import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export interface ApiFieldError {
  field: string;
  message: string;
}

/**
 * An API failure in one typed shape. The backend answers errors as RFC 9457 ProblemDetail with a `detail`
 * already in the request's language and, for validation, `errors: [{ field, message }]`.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail: string,
    readonly errors: readonly ApiFieldError[] = [],
  ) {
    super(detail || title);
    this.name = 'ApiError';
  }

  /** 0 when the request never reached the API (offline, DNS, CORS). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /** The message for one form field, if the API reported one. */
  fieldMessage(field: string): string | undefined {
    return this.errors.find((error) => error.field === field)?.message;
  }

  static from(response: HttpErrorResponse): ApiError {
    const body: unknown = response.error;
    if (isProblem(body)) {
      return new ApiError(
        response.status,
        body.title ?? response.statusText,
        body.detail ?? '',
        body.errors ?? [],
      );
    }
    return new ApiError(response.status, response.statusText || 'Error', response.message);
  }
}

interface Problem {
  title?: string;
  detail?: string;
  errors?: ApiFieldError[];
}

function isProblem(body: unknown): body is Problem {
  return typeof body === 'object' && body !== null && ('detail' in body || 'title' in body);
}

/** Turns every HTTP error into an ApiError, so components and resolvers handle one type. */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) =>
      throwError(() => (error instanceof HttpErrorResponse ? ApiError.from(error) : error)),
    ),
  );
