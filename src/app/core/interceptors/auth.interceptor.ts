import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, tap, throwError } from 'rxjs';

import { SessionService, SKIP_SESSION_RECOVERY } from '../auth/session.service';
import { AuthStateService } from '../auth/auth-state.service';
import { API_BASE_URL } from '../http/api-base-url.token';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authState = inject(AuthStateService);
  const apiBaseUrl = inject(API_BASE_URL);
  const router = inject(Router);

  const isApiRequest = isRequestToApi(request.url, apiBaseUrl);

  const session = isApiRequest ? inject(SessionService) : undefined;
  const revision = session?.revision ?? 0;
  const publicRequest = isPublicAuthenticationRequest(request);

  const authenticatedRequest = isApiRequest
    ? request.clone({
        withCredentials: true,
      })
    : request;

  return next(authenticatedRequest).pipe(
    tap((event) => {
      if (event instanceof HttpResponse && !publicRequest) session?.assertCurrent(revision);
    }),
    catchError((error) => {
      if (
        !session ||
        error.status !== 401 ||
        publicRequest ||
        request.context.get(SKIP_SESSION_RECOVERY)
      ) {
        return throwError(() => error);
      }
      session.assertCurrent(revision);
      return session.recover().pipe(
        catchError((failure: HttpErrorResponse) => {
          if (
            failure.status === 401 &&
            !authState.isAuthenticated() &&
            shouldRedirectToLogin(authenticatedRequest, router)
          ) {
            void router.navigate(['/login']).catch(() => undefined);
          }
          return throwError(() => failure);
        }),
        switchMap(() => {
          session.assertCurrent(revision);
          if (!['GET', 'HEAD'].includes(request.method)) {
            return throwError(
              () =>
                new HttpErrorResponse({
                  ...error,
                  error: {
                    ...error.error,
                    message:
                      requestPath(request.url) === '/api/users/me/change-password'
                        ? 'Confira a senha atual e tente novamente.'
                        : 'Sua sessão foi verificada. Repita a operação para continuar.',
                  },
                }),
            );
          }
          return next(authenticatedRequest).pipe(
            tap((event) => {
              if (event instanceof HttpResponse) session.assertCurrent(revision);
            }),
            catchError((failure: HttpErrorResponse) => {
              if (failure.status === 401 && session.revision === revision) {
                session.expire(revision);
                if (shouldRedirectToLogin(authenticatedRequest, router))
                  void router.navigate(['/login']).catch(() => undefined);
              }
              return throwError(() => failure);
            }),
          );
        }),
      );
    }),
  );
};

function shouldRedirectToLogin(request: { method: string; url: string }, router: Router): boolean {
  const navigationUrl = router.currentNavigation()?.initialUrl.toString();

  return (
    router.url !== '/login' &&
    navigationUrl !== '/login' &&
    !isPublicAuthenticationRequest(request) &&
    !isSessionRestorationRequest(request)
  );
}

function isPublicAuthenticationRequest(request: { method: string; url: string }): boolean {
  if (request.method === 'GET' && requestPath(request.url) === '/api/auth/csrf') return true;
  if (request.method !== 'POST') {
    return false;
  }

  const path = requestPath(request.url);

  return (
    path === '/api/auth/login' ||
    path === '/api/auth/refresh' ||
    path === '/api/auth/logout' ||
    path === '/api/users/change-initial-password'
  );
}

function isSessionRestorationRequest(request: { method: string; url: string }): boolean {
  return request.method === 'GET' && requestPath(request.url) === '/api/users/me';
}

function requestPath(requestUrl: string): string {
  const applicationOrigin = globalThis.location?.origin ?? 'http://localhost';

  return new URL(requestUrl, applicationOrigin).pathname;
}

export function isRequestToApi(requestUrl: string, apiBaseUrl: string): boolean {
  if (!apiBaseUrl) {
    return requestUrl === '/api' || requestUrl.startsWith('/api/');
  }

  const applicationOrigin = globalThis.location?.origin ?? 'http://localhost';
  const apiUrl = new URL(apiBaseUrl, applicationOrigin);
  const targetUrl = new URL(requestUrl, applicationOrigin);
  const apiPath = apiUrl.pathname.replace(/\/$/, '') || '/api';

  if (targetUrl.origin !== apiUrl.origin) {
    return false;
  }

  return targetUrl.pathname === apiPath || targetUrl.pathname.startsWith(`${apiPath}/`);
}
