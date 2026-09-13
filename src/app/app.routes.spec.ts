import { Routes } from '@angular/router';

import { LoginComponent } from './features/auth/login/login.component';
import { FirstAccessComponent } from './features/auth/first-access/first-access.component';
import { authGuard } from './core/guards/auth.guard';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { routes } from './app.routes';

describe('application routes', () => {
  it('should expose login as a public route', () => {
    const loginRoute = routes.find((route) => route.path === 'login');

    expect(loginRoute?.component).toBe(LoginComponent);
    expect(loginRoute?.canActivate).toBeUndefined();
  });

  it('should expose first access as a public route', () => {
    const firstAccessRoute = routes.find((route) => route.path === 'first-access');

    expect(firstAccessRoute?.component).toBe(FirstAccessComponent);
    expect(firstAccessRoute?.canActivate).toBeUndefined();
  });

  it('should protect the application shell route', () => {
    const applicationRoute = routes.find((route) => route.path === '');

    expect(applicationRoute?.component).toBe(AppShellComponent);
    expect(applicationRoute?.canActivate).toEqual([authGuard]);
  });
});
