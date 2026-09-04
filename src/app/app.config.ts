import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideCoreHttp } from './core/http/http.providers';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideCoreHttp(),

    provideAppInitializer(() => {
      const authService = inject(AuthService);

      return authService.restoreSession();
    }),
  ],
};
