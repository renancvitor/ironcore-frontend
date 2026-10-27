import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../../app.routes';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import { DialogService } from '../../shared/components/dialog/dialog.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { WorkoutCycleDetailComponent } from '../workout-planning/detail/workout-cycle-detail.component';
import { cycleDetail } from '../workout-planning/workout-planning.testing';
import { WorkoutSessionDetailComponent } from './detail/workout-session-detail.component';
import { sessionDetail } from './workout-sessions.testing';

describe('Workout Sessions navigation with HTTP', () => {
  let http: HttpTestingController;
  const url = '/api/users/me/workout-sessions';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        { provide: API_BASE_URL, useValue: '' },
        { provide: DialogService, useValue: { open: vi.fn(() => of(true)) } },
        { provide: ToastService, useValue: { success: vi.fn(), info: vi.fn() } },
      ],
    }).compileComponents();
    TestBed.inject(AuthStateService).setUser({
      userId: 1,
      email: 'person@test.dev',
      nickname: 'Person',
      mustChangePassword: false,
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('starts from planning, loads its actual snapshot, returns and recovers through the sidebar', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/workout-planning/9');
    const cycle = harness.fixture.debugElement.query(By.directive(WorkoutCycleDetailComponent))
      .componentInstance as WorkoutCycleDetailComponent;
    http.expectOne('/api/users/me/workout-cycles/9').flush(cycleDetail);
    cycle.startSession(cycleDetail.days[0]);
    http.expectOne(url).flush({ id: 100 }, { status: 201, statusText: 'Created' });
    await harness.fixture.whenStable();
    http.expectOne(`${url}/100`).flush(sessionDetail);
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/workout-sessions/100');
    expect(harness.routeNativeElement!.textContent).toContain('Ciclo preservado');
    expect(harness.routeNativeElement!.textContent).not.toContain(cycleDetail.name);

    const session = harness.fixture.debugElement.query(By.directive(WorkoutSessionDetailComponent))
      .componentInstance as WorkoutSessionDetailComponent;
    session.openSourceCycle();
    await harness.fixture.whenStable();
    http.expectOne('/api/users/me/workout-cycles/9').flush(cycleDetail);
    harness.detectChanges();
    harness.fixture.nativeElement.querySelector('button[aria-label="Abrir menu"]').click();
    harness.detectChanges();
    const link = harness.fixture.nativeElement.querySelector(
      'a[href="/workout-sessions"]',
    ) as HTMLAnchorElement;
    link.click();
    await harness.fixture.whenStable();
    http.expectOne(`${url}/in-progress`).flush(sessionDetail);
    await harness.fixture.whenStable();
    http.expectOne(`${url}/100`).flush(sessionDetail);
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/workout-sessions/100');
    expect(link.classList.contains('ic-sidebar__link--active')).toBe(true);
    expect(harness.routeNativeElement!.textContent).toContain('Treino preservado');
  });

  it('reloads when navigating directly and cancels a previous session read on ID changes', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/workout-sessions/100');
    const previous = http.expectOne(`${url}/100`);
    await harness.navigateByUrl('/workout-sessions/101');
    const session = harness.fixture.debugElement.query(By.directive(WorkoutSessionDetailComponent))
      .componentInstance as WorkoutSessionDetailComponent;
    expect(previous.cancelled).toBe(true);
    http
      .expectOne(`${url}/101`)
      .flush({ ...sessionDetail, id: 101, workoutDayTitleSnapshot: 'Outra sessão' });
    harness.detectChanges();
    expect(session.session()?.id).toBe(101);
    expect(harness.routeNativeElement!.textContent).toContain('Outra sessão');
    await harness.navigateByUrl('/workout-planning/9');
    http.expectOne('/api/users/me/workout-cycles/9').flush(cycleDetail);
    await harness.navigateByUrl('/workout-sessions/101');
    http
      .expectOne(`${url}/101`)
      .flush({ ...sessionDetail, id: 101, status: 'CLOSED', closeReason: 'AUTO_EXPIRED' });
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Encerrada automaticamente');
  });

  it.each(['/workout-sessions', '/workout-sessions/100'])(
    'rejects unauthenticated direct navigation to %s without a session request',
    async (path) => {
      TestBed.inject(AuthStateService).clear();
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(path);
      expect(TestBed.inject(Router).url).toBe('/login');
      http.expectNone((request) => request.url.startsWith(url));
    },
  );
});
