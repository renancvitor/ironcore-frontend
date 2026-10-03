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
import { MatPaginatorIntl } from '@angular/material/paginator';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/theme/theme.service';
import { PaginatorIntlPtBr } from './shared/config/paginator-intl-pt-br';

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
      provide: MatPaginatorIntl,
      useClass: PaginatorIntlPtBr,
    },
    {
      provide: LOCALE_ID,
      useValue: 'pt-BR',
    },
  ],
};
