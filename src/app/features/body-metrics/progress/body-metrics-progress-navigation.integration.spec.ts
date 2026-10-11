import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';

describe('body metrics progress contextual navigation', () => {
  let http: HttpTestingController;
  let router: Router;
  let harness: RouterTestingHarness;
  const endpoint = '/api/users/me/body-metrics';

  beforeEach(async () => {
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
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  function flushPage(path: string): void {
    if (path === '/') {
      http.expectOne(`${endpoint}/latest`).flush(null, { status: 404, statusText: 'Not Found' });
      const summary = http.expectOne((req) => req.url === `${endpoint}/progress/changes`);
      summary.flush({
        startDate: summary.request.params.get('startDate'),
        endDate: summary.request.params.get('endDate'),
        changes: [],
      });
    } else if (path === '/body-metrics') {
      http
        .expectOne(endpoint)
        .flush({
          metrics: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true },
        });
    } else {
      const chart = http.expectOne((req) => req.url === `${endpoint}/progress/body-composition`);
      chart.flush({
        startDate: chart.request.params.get('startDate'),
        endDate: chart.request.params.get('endDate'),
        chartType: 'BODY_COMPOSITION',
        series: [],
      });
    }
    harness.detectChanges();
  }

  async function click(selector: string): Promise<void> {
    const element = harness.routeNativeElement!.querySelector<HTMLElement>(selector);
    expect(element).toBeTruthy();
    element!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function returnTo(destination: string): Promise<void> {
    const label = destination === '/' ? 'Voltar ao início' : 'Voltar ao histórico';
    await click(`app-body-metrics-progress button[aria-label="${label}"]`);
    expect(router.url).toBe(destination);
    flushPage(destination);
  }

  it.each([
    ['/', 'home', 'app-body-metrics-progress-card footer a'],
    ['/body-metrics', 'history', 'button[aria-label="Ver evolução"]'],
  ])('opens from %s and returns to that origin', async (origin, from, selector) => {
    await harness.navigateByUrl(origin);
    flushPage(origin);
    await click(selector);
    expect(router.url).toBe(`/body-metrics/progress?from=${from}`);
    flushPage(router.url);
    await returnTo(origin);
  });

  it.each([
    ['?from=home', '/'],
    ['?from=history', '/body-metrics'],
    ['', '/body-metrics'],
    ['?from=unknown', '/body-metrics'],
    ['?from=https%3A%2F%2Fexample.com&returnUrl=https%3A%2F%2Fexample.com', '/body-metrics'],
  ])('uses only the URL origin on a fresh entry or refresh (%s)', async (query, destination) => {
    await harness.navigateByUrl(`/body-metrics/progress${query}`);
    flushPage(router.url);
    await returnTo(destination);
  });

  it('clears the Home origin when opening progress through the sidebar on the same screen', async () => {
    await harness.navigateByUrl('/body-metrics/progress?from=home');
    flushPage(router.url);
    await click('app-header button[aria-label="Abrir menu"]');
    await click('app-sidebar a[href="/body-metrics/progress"]');
    expect(router.url).toBe('/body-metrics/progress');
    http.expectNone((req) => req.url.startsWith(endpoint));
    await returnTo('/body-metrics');
  });
});
