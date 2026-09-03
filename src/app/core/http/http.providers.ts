import { provideHttpClient } from '@angular/common/http';
import { makeEnvironmentProviders } from '@angular/core';

import { environment } from '../../../environments/environment';
import { API_BASE_URL } from './api-base-url.token';

export function provideCoreHttp() {
  return makeEnvironmentProviders([
    provideHttpClient(),
    {
      provide: API_BASE_URL,
      useValue: environment.apiBaseUrl,
    },
  ]);
}
