import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'first-access',
    loadComponent: () =>
      import('./features/auth/first-access/first-access.component').then(
        (m) => m.FirstAccessComponent,
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'change-password',
        loadComponent: () =>
          import('./features/profile/change-password/change-password.component').then(
            (m) => m.ChangePasswordComponent,
          ),
      },
      {
        path: 'body-metrics',
        loadComponent: () =>
          import('./features/body-metrics/history/body-metrics-history.component').then(
            (m) => m.BodyMetricsHistoryComponent,
          ),
      },
      {
        path: 'body-metrics/latest',
        loadComponent: () =>
          import('./features/body-metrics/latest/body-metrics-latest.component').then(
            (m) => m.BodyMetricsLatestComponent,
          ),
      },
      {
        path: 'body-metrics/:id',
        loadComponent: () =>
          import('./features/body-metrics/details/body-metrics-detail.component').then(
            (m) => m.BodyMetricsDetailComponent,
          ),
      },
    ],
  },
];
