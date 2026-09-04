import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthStateService } from '../auth/auth-state.service';
import { API_BASE_URL } from '../http/api-base-url.token';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authState = inject(AuthStateService);
  const apiBaseUrl = inject(API_BASE_URL);

  const isApiRequest = isRequestToApi(request.url, apiBaseUrl);

  const authenticatedRequest = isApiRequest
    ? request.clone({
        withCredentials: true,
      })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error) => {
      if (error.status === 401) {
        authState.clear();
      }

      return throwError(() => error);
    }),
  );
};

function isRequestToApi(requestUrl: string, apiBaseUrl: string): boolean {
  if (!apiBaseUrl) {
    return requestUrl === '/api' || requestUrl.startsWith('/api/');
  }

  const applicationOrigin = globalThis.location?.origin ?? 'http://localhost';
  const apiUrl = new URL(apiBaseUrl, applicationOrigin);
  const targetUrl = new URL(requestUrl, applicationOrigin);
  const apiPath = apiUrl.pathname.replace(/\/$/, '');

  if (targetUrl.origin !== apiUrl.origin) {
    return false;
  }

  return !apiPath || targetUrl.pathname === apiPath || targetUrl.pathname.startsWith(`${apiPath}/`);
}
