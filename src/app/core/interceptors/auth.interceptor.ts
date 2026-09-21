import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthStateService } from '../auth/auth-state.service';
import { API_BASE_URL } from '../http/api-base-url.token';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authState = inject(AuthStateService);
  const apiBaseUrl = inject(API_BASE_URL);
  const router = inject(Router);

  const isApiRequest = isRequestToApi(request.url, apiBaseUrl);

  const authenticatedRequest = isApiRequest
    ? request.clone({
        withCredentials: true,
      })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error) => {
      if (isApiRequest && error.status === 401) {
        authState.clear();

        if (shouldRedirectToLogin(authenticatedRequest, router)) {
          void router.navigate(['/login']).catch(() => undefined);
        }
      }

      return throwError(() => error);
    }),
  );
};

function shouldRedirectToLogin(request: { method: string; url: string }, router: Router): boolean {
  const navigationUrl = router.currentNavigation()?.initialUrl.toString();

  return router.url !== '/login'
    && navigationUrl !== '/login'
    && !isPublicAuthenticationRequest(request)
    && !isSessionRestorationRequest(request);
}

function isPublicAuthenticationRequest(request: { method: string; url: string }): boolean {
  if (request.method !== 'POST') {
    return false;
  }

  const path = requestPath(request.url);

  return path === '/api/auth/login'
    || path === '/api/auth/logout'
    || path === '/api/users/change-initial-password';
}

function isSessionRestorationRequest(request: { method: string; url: string }): boolean {
  return request.method === 'GET' && requestPath(request.url) === '/api/users/me';
}

function requestPath(requestUrl: string): string {
  const applicationOrigin = globalThis.location?.origin ?? 'http://localhost';

  return new URL(requestUrl, applicationOrigin).pathname;
}

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
