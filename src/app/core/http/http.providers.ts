import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { makeEnvironmentProviders } from '@angular/core';

import { environment } from '../../../environments/environment';
import { API_BASE_URL } from './api-base-url.token';
import { authInterceptor } from '../interceptors/auth.interceptor';

export function provideCoreHttp() {
  return makeEnvironmentProviders([
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: API_BASE_URL,
      useValue: environment.apiBaseUrl,
    },
  ]);
}
