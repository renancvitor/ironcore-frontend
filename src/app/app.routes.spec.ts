import { LoginComponent } from './features/auth/login/login.component';
import { FirstAccessComponent } from './features/auth/first-access/first-access.component';
import { authGuard } from './core/guards/auth.guard';
import { AuthStateService } from './core/auth/auth-state.service';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { HomeComponent } from './features/home/home.component';
import { ProfileComponent } from './features/profile/profile.component';
import { ChangePasswordComponent } from './features/profile/change-password/change-password.component';
import { BodyMetricsHistoryComponent } from './features/body-metrics/history/body-metrics-history.component';
import { BodyMetricsDetailComponent } from './features/body-metrics/details/body-metrics-detail.component';
import { routes } from './app.routes';

describe('application routes', () => {
  it('should load login as a public route', async () => {
    const loginRoute = routes.find((route) => route.path === 'login');

    expect(await loginRoute?.loadComponent?.()).toBe(LoginComponent);
    expect(loginRoute?.canActivate).toBeUndefined();
  });

  it('should load first access as a public route', async () => {
    const firstAccessRoute = routes.find((route) => route.path === 'first-access');

    expect(await firstAccessRoute?.loadComponent?.()).toBe(FirstAccessComponent);
    expect(firstAccessRoute?.canActivate).toBeUndefined();
  });

  it('should load the application shell behind the authentication guard', async () => {
    const applicationRoute = routes.find((route) => route.path === '');

    expect(await applicationRoute?.loadComponent?.()).toBe(AppShellComponent);
    expect(applicationRoute?.canActivate).toEqual([authGuard]);
  });

  it('should load home inside the protected shell', async () => {
    const applicationRoute = routes.find((route) => route.path === '');
    const homeRoute = applicationRoute?.children?.find((route) => route.path === '');

    expect(applicationRoute?.canActivate).toEqual([authGuard]);
    expect(await homeRoute?.loadComponent?.()).toBe(HomeComponent);
  });

  it('should load profile and password change as protected child routes', async () => {
    const applicationRoute = routes.find((route) => route.path === '');
    const profileRoute = applicationRoute?.children?.find((route) => route.path === 'profile');
    const changePasswordRoute = applicationRoute?.children?.find(
      (route) => route.path === 'change-password',
    );

    expect(await profileRoute?.loadComponent?.()).toBe(ProfileComponent);
    expect(await changePasswordRoute?.loadComponent?.()).toBe(ChangePasswordComponent);
  });

  it('should load body metrics history inside the protected shell', async () => {
    const applicationRoute = routes.find((route) => route.path === '');
    const historyRoute = applicationRoute?.children?.find((route) => route.path === 'body-metrics');

    expect(applicationRoute?.canActivate).toEqual([authGuard]);
    expect(await historyRoute?.loadComponent?.()).toBe(BodyMetricsHistoryComponent);
  });

  it('should load body metrics details inside the protected shell', async () => {
    const applicationRoute = routes.find((route) => route.path === '');
    const detailRoute = applicationRoute?.children?.find(
      (route) => route.path === 'body-metrics/:id',
    );

    expect(applicationRoute?.canActivate).toEqual([authGuard]);
    expect(await detailRoute?.loadComponent?.()).toBe(BodyMetricsDetailComponent);
  });
});

describe('lazy route authentication', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(AuthStateService).clear();
  });

  it.each(['/', '/profile', '/change-password', '/body-metrics', '/body-metrics/1'])(
    'should redirect unauthenticated access to %s to login',
    async (url) => {
      const harness = await RouterTestingHarness.create();
      const login = await harness.navigateByUrl(url, LoginComponent);

      expect(login).toBeInstanceOf(LoginComponent);
      expect(TestBed.inject(Router).url).toBe('/login');
      expect(harness.routeNativeElement?.querySelector('app-app-shell')).toBeNull();
    },
  );
});
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
