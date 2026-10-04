import { LoginComponent } from './features/auth/login/login.component';
import { FirstAccessComponent } from './features/auth/first-access/first-access.component';
import { authGuard } from './core/guards/auth.guard';
import { AuthStateService } from './core/auth/auth-state.service';
import { API_BASE_URL } from './core/http/api-base-url.token';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { HomeComponent } from './features/home/home.component';
import { ProfileComponent } from './features/profile/profile.component';
import { ChangePasswordComponent } from './features/profile/change-password/change-password.component';
import { BodyMetricsHistoryComponent } from './features/body-metrics/history/body-metrics-history.component';
import { BodyMetricsDetailComponent } from './features/body-metrics/details/body-metrics-detail.component';
import { BodyMetricsLatestComponent } from './features/body-metrics/latest/body-metrics-latest.component';
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

  it('loads the independent latest screen before the dynamic detail route', async () => {
    const children = routes.find((route) => route.path === '')!.children!;
    const latestIndex = children.findIndex((route) => route.path === 'body-metrics/latest');
    expect(latestIndex).toBeGreaterThanOrEqual(0);
    expect(latestIndex).toBeLessThan(
      children.findIndex((route) => route.path === 'body-metrics/:id'),
    );
    expect(await children[latestIndex].loadComponent?.()).toBe(BodyMetricsLatestComponent);
  });
});

describe('lazy route authentication', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' },
      ],
    });
    TestBed.inject(AuthStateService).clear();
  });

  it.each([
    '/',
    '/profile',
    '/change-password',
    '/body-metrics',
    '/body-metrics/latest',
    '/body-metrics/1',
  ])('should redirect unauthenticated access to %s to login', async (url) => {
    const harness = await RouterTestingHarness.create();
    const login = await harness.navigateByUrl(url, LoginComponent);

    expect(login).toBeInstanceOf(LoginComponent);
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.querySelector('app-app-shell')).toBeNull();
  });
});
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

describe('independent body metrics screens', () => {
  it.each([
    ['/body-metrics/latest', 'app-body-metrics-latest', 'app-body-metrics-detail', '/'],
    ['/body-metrics/42', 'app-body-metrics-detail', 'app-body-metrics-latest', '/body-metrics'],
  ])(
    'renders the proper component and return action for %s',
    async (url, selector, absent, returnUrl) => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter(routes),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: API_BASE_URL, useValue: '' },
        ],
      });
      TestBed.inject(AuthStateService).setUser({
        userId: 1,
        email: 'test@example.test',
        nickname: 'Teste',
        mustChangePassword: false,
      });
      const http = TestBed.inject(HttpTestingController);
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(url);
      const request = http.expectOne(`/api/users/me${url}`);
      request.flush({
        id: 42,
        measuredAt: '2026-09-30T08:30:00',
        weightKg: 82.4,
        heightCm: 178.5,
        bmi: 25.8,
        bodyFatPercentage: null,
        fatMassKg: null,
        leanMassKg: null,
        circumferences: null,
        notes: null,
        updatedAt: null,
      });
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector(selector)).toBeTruthy();
      expect(harness.routeNativeElement?.querySelector(absent)).toBeNull();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      (
        harness.routeNativeElement?.querySelector(`${selector} button`) as HTMLButtonElement
      ).click();
      expect(navigate).toHaveBeenCalledExactlyOnceWith([returnUrl]);
      http.verify();
    },
  );
});
