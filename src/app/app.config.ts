import {
  ApplicationConfig,
  inject,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideCoreHttp } from './core/http/http.providers';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/theme/theme.service';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideCoreHttp(),

    provideAppInitializer(() => {
      inject(ThemeService);
    }),

    provideAppInitializer(() => {
      const authService = inject(AuthService);

      return authService.restoreSession();
    }),
    {
      provide: LOCALE_ID,
      useValue: 'pt-BR',
    },
  ],
};
