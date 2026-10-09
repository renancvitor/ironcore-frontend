import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';
import { AuthStateService } from './core/auth/auth-state.service';
import { authGuard } from './core/guards/auth.guard';
import { API_BASE_URL } from './core/http/api-base-url.token';
import { FirstAccessComponent } from './features/auth/first-access/first-access.component';
import { LoginComponent } from './features/auth/login/login.component';
import { BodyMetricsCreateComponent } from './features/body-metrics/create/body-metrics-create.component';
import { BodyMetricsDetailComponent } from './features/body-metrics/details/body-metrics-detail.component';
import { BodyMetricsHistoryComponent } from './features/body-metrics/history/body-metrics-history.component';
import { BodyMetricsLatestComponent } from './features/body-metrics/latest/body-metrics-latest.component';
import { BodyMetricsProgressComponent } from './features/body-metrics/progress/body-metrics-progress.component';
import { HomeComponent } from './features/home/home.component';
import { ChangePasswordComponent } from './features/profile/change-password/change-password.component';
import { ProfileComponent } from './features/profile/profile.component';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { ToastService } from './shared/components/toast/toast.service';

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

  it('lazy loads one evolution screen before the dynamic detail route', async () => {
    const children = routes.find((route) => route.path === '')!.children!;
    const index = children.findIndex((route) => route.path === 'body-metrics/progress');
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(children.findIndex((route) => route.path === 'body-metrics/:id'));
    expect(await children[index].loadComponent?.()).toBe(BodyMetricsProgressComponent);
  });

  it('lazy loads creation before the dynamic detail route inside the protected shell', async () => {
    const shell = routes.find((route) => route.path === '')!;
    const children = shell.children!;
    const index = children.findIndex((route) => route.path === 'body-metrics/create');
    expect(shell.canActivate).toEqual([authGuard]);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(children.findIndex((route) => route.path === 'body-metrics/:id'));
    expect(await children[index].loadComponent?.()).toBe(BodyMetricsCreateComponent);
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
    '/body-metrics/progress',
    '/body-metrics/create',
    '/body-metrics/1',
  ])('should redirect unauthenticated access to %s to login', async (url) => {
    const harness = await RouterTestingHarness.create();
    const login = await harness.navigateByUrl(url, LoginComponent);

    expect(login).toBeInstanceOf(LoginComponent);
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.querySelector('app-app-shell')).toBeNull();
  });
});

describe('independent body metrics screens', () => {
  it('creates an evaluation and reloads previously visited dependent screens', async () => {
    const success = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' },
        { provide: ToastService, useValue: { success } },
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
    const endpoint = '/api/users/me/body-metrics';
    const metric = {
      id: 42,
      personId: 1,
      measuredAt: '2026-10-08T08:30:00',
      weightKg: 80,
      heightCm: 180,
      bmi: 24.69,
      circumferences: null,
      bodyFatPercentage: null,
      fatMassKg: null,
      leanMassKg: null,
      notes: 'Nova avaliação de integração',
      updatedAt: null,
    };

    async function visitQueries(afterCreation: boolean): Promise<void> {
      await harness.navigateByUrl('/body-metrics');
      const history = http.expectOne((request) => request.url === endpoint);
      expect(history.request.method).toBe('GET');
      history.flush({
        metrics: {
          content: afterCreation ? [metric] : [],
          page: 0,
          size: 20,
          totalElements: afterCreation ? 1 : 0,
          totalPages: afterCreation ? 1 : 0,
          last: true,
        },
      });
      harness.detectChanges();
      if (afterCreation) expect(harness.routeNativeElement?.textContent).toContain(metric.notes);

      await harness.navigateByUrl('/');
      const latest = http.expectOne(`${endpoint}/latest`);
      if (afterCreation) latest.flush(metric);
      else latest.flush(null, { status: 404, statusText: 'Not Found' });
      harness.detectChanges();
      if (afterCreation) {
        expect(
          harness.routeNativeElement?.querySelector('app-body-metrics-latest')?.textContent,
        ).toContain('80');
      }

      await harness.navigateByUrl('/body-metrics/progress');
      const progress = http.expectOne(
        (request) => request.url === `${endpoint}/progress/body-composition`,
      );
      expect(progress.request.method).toBe('GET');
      const startDate = progress.request.params.get('startDate');
      const endDate = progress.request.params.get('endDate');
      progress.flush({ startDate, endDate, chartType: 'BODY_COMPOSITION', series: [] });
      harness.detectChanges();

      const changes = harness.routeNativeElement?.querySelector(
        'input[value="CHANGES"]',
      ) as HTMLInputElement;
      changes.click();
      harness.detectChanges();
      const comparison = http.expectOne(
        (request) => request.url === `${endpoint}/progress/changes`,
      );
      expect(comparison.request.method).toBe('GET');
      comparison.flush({ startDate, endDate, changes: [] });
      harness.detectChanges();
    }

    await visitQueries(false);
    await harness.navigateByUrl('/body-metrics/create');
    expect(harness.routeNativeElement?.querySelector('app-body-metrics-create')).toBeTruthy();
    expect(harness.routeNativeElement?.querySelector('app-body-metrics-detail')).toBeNull();
    http.expectNone(`${endpoint}/create`);
    for (const [name, value] of [
      ['weightKg', '80'],
      ['heightCm', '180'],
    ]) {
      const input = harness.routeNativeElement?.querySelector(`#${name}`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    (
      harness.routeNativeElement?.querySelector('button[type="submit"]') as HTMLButtonElement
    ).click();
    const create = http.expectOne(endpoint);
    expect(create.request.method).toBe('POST');
    create.flush(metric, { status: 201, statusText: 'Created' });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/body-metrics/42');
    http.expectOne(`${endpoint}/42`).flush(metric);
    harness.detectChanges();
    expect(
      harness.routeNativeElement?.querySelector('app-body-metrics-detail')?.textContent,
    ).toContain(metric.notes);
    expect(success).toHaveBeenCalledOnce();

    await visitQueries(true);
    http.verify();
  });

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
