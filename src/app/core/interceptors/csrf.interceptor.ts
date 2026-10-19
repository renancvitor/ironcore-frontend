import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap } from 'rxjs';

import { CsrfService } from '../auth/csrf.service';
import { API_BASE_URL } from '../http/api-base-url.token';
import { isRequestToApi } from './auth.interceptor';

export const csrfInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  if (
    !isRequestToApi(request.url, apiBaseUrl) ||
    ['GET', 'HEAD', 'OPTIONS'].includes(request.method)
  ) {
    return next(request);
  }

  return inject(CsrfService)
    .getToken()
    .pipe(
      switchMap(({ headerName, token }) =>
        next(
          request.clone({
            setHeaders: { [headerName]: token },
            withCredentials: true,
          }),
        ),
      ),
    );
};
