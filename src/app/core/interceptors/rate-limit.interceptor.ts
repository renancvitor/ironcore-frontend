import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../http/api-base-url.token';
import { isRequestToApi } from './auth.interceptor';

@Injectable({ providedIn: 'root' })
export class AuthenticationCooldown {
  readonly deadlines = new Map<string, number>();
}

const paths = new Set([
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/users/change-initial-password',
  '/api/users/me/change-password',
]);

export const rateLimitInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const path = new URL(request.url, globalThis.location?.origin ?? 'http://localhost').pathname;
  if (!isRequestToApi(request.url, apiBaseUrl) || request.method !== 'POST' || !paths.has(path))
    return next(request);
  const cooldown = inject(AuthenticationCooldown);
  const remaining = Math.ceil(((cooldown.deadlines.get(path) ?? 0) - Date.now()) / 1000);
  const limited = (seconds: number, original?: HttpErrorResponse) =>
    new HttpErrorResponse({
      status: 429,
      statusText: 'Too Many Requests',
      headers: original?.headers,
      error: {
        message: 'Muitas tentativas. Aguarde ' + seconds + ' segundos antes de tentar novamente.',
      },
    });
  if (remaining > 0) return throwError(() => limited(remaining));
  cooldown.deadlines.delete(path);
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 429) return throwError(() => error);
      const retry = error.headers.get('Retry-After');
      const seconds =
        retry && /^\d+$/.test(retry)
          ? Number(retry)
          : retry
            ? Math.ceil((Date.parse(retry) - Date.now()) / 1000)
            : NaN;
      if (!Number.isFinite(seconds) || seconds <= 0) return throwError(() => error);
      cooldown.deadlines.set(path, Date.now() + seconds * 1000);
      return throwError(() => limited(seconds, error));
    }),
  );
};
