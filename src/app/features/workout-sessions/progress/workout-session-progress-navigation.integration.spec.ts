import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../../../app.routes';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { WorkoutSessionDetailComponent } from '../detail/workout-session-detail.component';
import { WorkoutSessionHistoryComponent } from '../history/workout-session-history.component';
import { sessionDetail, sessionHistory } from '../workout-sessions.testing';
import { WorkoutSessionProgressComponent } from './workout-session-progress.component';
import {
  cardioResponse,
  strengthPoint,
  strengthResponse,
} from './workout-session-progress.testing';

describe('Workout Session progress navigation with real routes and HTTP', () => {
  const url = '/api/users/me/workout-sessions';
  const dialog = { open: vi.fn() };
  let http: HttpTestingController;
  let router: Router;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    dialog.open.mockReset().mockReturnValue(of(true));
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' },
        { provide: DialogService, useValue: dialog },
        { provide: ToastService, useValue: { success: vi.fn(), info: vi.fn() } },
      ],
    });
    TestBed.inject(AuthStateService).setUser({
      userId: 1,
      email: 'person@test.dev',
      nickname: 'Person',
      mustChangePassword: false,
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => http.verify());

  const current = <T>(type: new (...args: never[]) => T): T =>
    harness.fixture.debugElement.query(By.directive(type)).componentInstance;
  async function settle() {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }
  async function flushAnalytics() {
    const requests = http.match((req) => req.url.startsWith(url + '/analytics/'));
    expect(requests).toHaveLength(2);
    for (const request of requests)
      request.flush(
        request.request.url.endsWith('/strength') ? strengthResponse() : cardioResponse(),
      );
    await settle();
  }
  async function closedSession(query = '', exerciseId: number | null = 50) {
    await harness.navigateByUrl(`${url.replace('/api/users/me', '')}/100${query}`);
    http.expectOne(url + '/100').flush({
      ...sessionDetail,
      status: 'CLOSED',
      closeReason: 'MANUAL',
      performedOn: '2024-02-29',
      finishedAt: '2024-02-29T14:00:00Z',
      activities: sessionDetail.activities.map((activity) => ({ ...activity, exerciseId })),
    });
    harness.detectChanges();
    return current(WorkoutSessionDetailComponent);
  }

  it('lazy loads progress before :id inside the authenticated shell and rejects unauthenticated access', async () => {
    const children = routes.find((route) => route.path === '')!.children!;
    const index = children.findIndex((route) => route.path === 'workout-sessions/progress');
    expect(index).toBeLessThan(
      children.findIndex((route) => route.path === 'workout-sessions/:id'),
    );
    expect(await children[index].loadComponent?.()).toBe(WorkoutSessionProgressComponent);
    TestBed.inject(AuthStateService).clear();
    await harness.navigateByUrl('/workout-sessions/progress?exerciseId=50');
    expect(router.url).toBe('/login');
    http.expectNone((req) => req.url.startsWith(url));
  });

  it('opens from history and the sidebar without confusing progress with a session ID', async () => {
    await harness.navigateByUrl('/workout-sessions/history');
    http.expectOne((req) => req.url === url).flush(sessionHistory());
    harness.detectChanges();
    const button = [
      ...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('button'),
    ].find((item) => item.textContent?.includes('Ver evolução'))!;
    button.click();
    await settle();
    expect(current(WorkoutSessionProgressComponent)).toBeTruthy();
    expect(router.url).toBe('/workout-sessions/progress');
    harness.fixture.nativeElement.querySelector('button[aria-label="Abrir menu"]').click();
    harness.detectChanges();
    await settle();
    const link = harness.fixture.nativeElement.querySelector(
      'a[href="/workout-sessions/progress"]',
    ) as HTMLAnchorElement;
    expect(link.classList.contains('ic-sidebar__link--active')).toBe(true);
    expect(link.getAttribute('aria-current')).toBe('page');
    http.expectNone(url + '/progress');
    http.expectNone(() => true);
  });

  it('opens inactive historical exercises directly and contextualizes an old session', async () => {
    await closedSession('?from=history');
    const button = harness.routeNativeElement!.querySelector<HTMLButtonElement>(
      'button[aria-label="Ver evolução deste exercício"]',
    )!;
    button.click();
    await settle();
    const component = current(WorkoutSessionProgressComponent);
    expect(component.period()).toEqual({ startDate: '2023-09-01', endDate: '2024-02-29' });
    expect(component.exerciseName()).toBe('Exercício preservado');
    http.expectNone((req) => req.url.includes('exercise-catalog'));
    const strength = http.expectOne((req) => req.url === url + '/analytics/exercises/50/strength');
    expect(strength.request.params.get('endDate')).toBe('2024-02-29');
    strength.flush(strengthResponse([strengthPoint({ performedOn: '2024-02-29' })]));
    http.expectOne((req) => req.url.endsWith('/50/cardio')).flush(cardioResponse([]));
    await settle();
    expect(router.url).toContain('sourceSessionId=100');
    expect(router.url).toContain('startDate=2023-09-01');
    component.back();
    await settle();
    expect(router.url).toContain('/workout-sessions/100?');
    http
      .expectOne(url + '/100')
      .flush({ ...sessionDetail, status: 'CLOSED', closeReason: 'MANUAL' });
    harness.detectChanges();
    expect(current(WorkoutSessionDetailComponent).returnLabel).toBe(
      'Voltar ao histórico de sessões',
    );
  });

  it('preserves period/indicator on detail round trips and fetches corrected execution again', async () => {
    const query =
      'exerciseId=50&startDate=2025-01-01&endDate=2025-02-01&family=cardio&metric=averagePaceMinPerKm';
    await harness.navigateByUrl('/workout-sessions/progress?' + query);
    await flushAnalytics();
    current(WorkoutSessionProgressComponent).openSession(100);
    await settle();
    http
      .expectOne(url + '/100')
      .flush({ ...sessionDetail, status: 'CLOSED', closeReason: 'MANUAL' });
    harness.detectChanges();
    expect(router.url).toContain('from=progress');
    harness.fixture.nativeElement.querySelector('button[aria-label="Abrir menu"]').click();
    harness.detectChanges();
    const link = harness.fixture.nativeElement.querySelector(
      'a[href="/workout-sessions/progress"]',
    ) as HTMLAnchorElement;
    const openSessionLink = harness.fixture.nativeElement.querySelector(
      'a[href="/workout-sessions"]',
    ) as HTMLAnchorElement;
    expect(link.classList.contains('ic-sidebar__link--active')).toBe(true);
    expect(openSessionLink.classList.contains('ic-sidebar__link--active')).toBe(false);
    const detail = current(WorkoutSessionDetailComponent);
    expect(detail.returnLabel).toBe('Voltar à evolução de treinos');
    detail.returnToList();
    await settle();
    await flushAnalytics();
    const component = current(WorkoutSessionProgressComponent);
    expect(component.period()).toEqual({ startDate: '2025-01-01', endDate: '2025-02-01' });
    expect(component.indicator().key).toBe('averagePaceMinPerKm');
    expect(component.family()).toBe('cardio');
  });

  it('keeps the existing selected period when opening another historical activity', async () => {
    const detail = await closedSession(
      '?from=history&exerciseId=50&startDate=2025-01-01&endDate=2025-02-01&family=cardio&metric=distanceKm',
    );
    detail.openExerciseProgress(50);
    await settle();
    expect(current(WorkoutSessionProgressComponent).period()).toEqual({
      startDate: '2025-01-01',
      endDate: '2025-02-01',
    });
    await flushAnalytics();
  });

  it('protects unsaved corrections on closed sessions before opening analytics', async () => {
    const detail = await closedSession('?from=history');
    detail.editor.notes.setValue('Rascunho a preservar');
    dialog.open.mockReturnValue(of(false));
    detail.openExerciseProgress(50);
    await settle();
    expect(router.url).toBe('/workout-sessions/100?from=history');
    expect(detail.editor.notes.value).toBe('Rascunho a preservar');
    expect(dialog.open).toHaveBeenCalledTimes(1);
    http.expectNone((req) => req.url.includes('/analytics/'));
    dialog.open.mockReturnValue(of(true));
    detail.openExerciseProgress(50);
    await settle();
    expect(current(WorkoutSessionProgressComponent)).toBeTruthy();
    expect(dialog.open).toHaveBeenCalledTimes(2);
    await flushAnalytics();
  });

  it('explains a deleted exercise reference without attempting name-based analytics', async () => {
    const detail = await closedSession('?from=history', null);
    expect(harness.routeNativeElement!.textContent).toContain(
      'O vínculo deste exercício foi excluído',
    );
    expect(harness.routeNativeElement!.textContent).toContain('Exercício preservado');
    expect(harness.routeNativeElement!.querySelector(
      'button[aria-label="Ver evolução deste exercício"]',
    )).toBeNull();
    detail.openExerciseProgress(50);
    await settle();
    http.expectNone((req) => req.url.includes('/analytics/'));
  });

  it('retains the analytical selection when returning through history', async () => {
    const query =
      'exerciseId=50&startDate=2025-01-01&endDate=2025-02-01&family=strength&metric=volumeKgReps';
    await harness.navigateByUrl('/workout-sessions/progress?' + query);
    await flushAnalytics();
    current(WorkoutSessionProgressComponent).openHistory();
    await settle();
    http.expectOne((req) => req.url === url).flush(sessionHistory());
    harness.detectChanges();
    expect(router.url).toContain('metric=volumeKgReps');
    current(WorkoutSessionHistoryComponent).openSession(100); await settle();
    http.expectOne(url + '/100').flush({ ...sessionDetail, status: 'CLOSED', closeReason: 'MANUAL' });
    harness.detectChanges();
    current(WorkoutSessionDetailComponent).returnToList(); await settle();
    http.expectOne((req) => req.url === url).flush(sessionHistory()); harness.detectChanges();
    expect(router.url).toContain('metric=volumeKgReps');
    current(WorkoutSessionHistoryComponent).openProgress();
    await settle();
    await flushAnalytics();
    expect(current(WorkoutSessionProgressComponent).indicator().key).toBe('volumeKgReps');
  });
});
