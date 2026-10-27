import { provideHttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavigationCancel, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom, of, Subject, throwError } from 'rxjs';
import { routes } from '../../app.routes';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import { DialogService } from '../../shared/components/dialog/dialog.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { WorkoutCycleDetailComponent } from '../workout-planning/detail/workout-cycle-detail.component';
import { cycleDetail } from '../workout-planning/workout-planning.testing';
import { WorkoutSessionDetailComponent } from './detail/workout-session-detail.component';
import { sessionDetail, sessionSet } from './workout-sessions.testing';
import { sessionHistory } from './workout-sessions.testing';
import { WorkoutSessionHistoryComponent } from './history/workout-session-history.component';

describe('Workout Sessions navigation with HTTP', () => {
  let http: HttpTestingController;
  const url = '/api/users/me/workout-sessions';
  const dialog = { open: vi.fn() };

  beforeEach(async () => {
    dialog.open.mockReset().mockReturnValue(of(true));
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        provideLocationMocks(),
        { provide: API_BASE_URL, useValue: '' },
        { provide: DialogService, useValue: dialog },
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

  function current(harness: RouterTestingHarness): WorkoutSessionDetailComponent {
    return harness.fixture.debugElement.query(By.directive(WorkoutSessionDetailComponent)).componentInstance;
  }

  async function openSession() {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/workout-sessions/100');
    http.expectOne(`${url}/100`).flush(structuredClone(sessionDetail));
    harness.detectChanges();
    return { harness, component: current(harness), router: TestBed.inject(Router) };
  }

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

  it.each(['/workout-sessions', '/workout-sessions/history', '/workout-sessions/100'])(
    'rejects unauthenticated direct navigation to %s without a session request',
    async (path) => {
      TestBed.inject(AuthStateService).clear();
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(path);
      expect(TestBed.inject(Router).url).toBe('/login');
      http.expectNone((request) => request.url.startsWith(url));
    },
  );

  it.each([false, undefined, 'error'] as const)(
    'keeps URL, reused instance and drafts when changing IDs is rejected with %s', async (accepted) => {
      const { harness, component, router } = await openSession();
      const form = component.editor.activities()[0].rows[0].form;
      form.controls.notes.setValue('Preservar ao trocar ID');
      dialog.open.mockReturnValue(accepted === 'error' ? throwError(() => new Error('Falha')) : of(accepted));
      expect(await router.navigateByUrl('/workout-sessions/101')).toBe(false);
      expect(router.url).toBe('/workout-sessions/100');
      expect(current(harness)).toBe(component);
      expect(component.session()?.id).toBe(100);
      expect(component.editor.activities()[0].rows[0].form).toBe(form);
      expect(form.controls.notes.value).toBe('Preservar ao trocar ID');
      expect(component.navigationConfirming()).toBe(false);
      expect(dialog.open).toHaveBeenCalledTimes(1);
      http.expectNone(`${url}/101`);
    },
  );

  it('waits for confirmation before delivering paramMap to the reused component and asks only once', async () => {
    const { harness, component, router } = await openSession();
    component.editor.notes.setValue('Rascunho anterior');
    const confirmation = new Subject<boolean>();
    let opened!: () => void;
    const didOpen = new Promise<void>((resolve) => { opened = resolve; });
    dialog.open.mockImplementation(() => { opened(); return confirmation; });
    const navigation = router.navigateByUrl('/workout-sessions/101');
    await didOpen;
    expect(component.session()?.id).toBe(100);
    expect(component.editor.notes.value).toBe('Rascunho anterior');
    http.expectNone(`${url}/101`);
    confirmation.next(true);
    expect(await navigation).toBe(true);
    expect(current(harness)).toBe(component);
    http.expectOne(`${url}/101`).flush({ ...structuredClone(sessionDetail), id: 101 });
    expect(component.session()?.id).toBe(101);
    expect(component.editor.notes.value).toBe('');
    expect(dialog.open).toHaveBeenCalledTimes(1);
  });

  it('blocks ID changes and exits while a write or its reconciliation is pending', async () => {
    const { harness, component, router } = await openSession();
    const activity = component.editor.activities()[0];
    activity.rows[0].form.controls.actualReps.setValue(8);
    component.editor.saveSet(activity, activity.rows[0]);
    const creation = http.expectOne(`${url}/100/activities/200/sets`);
    for (const target of ['/workout-sessions/101', '/workout-planning/9', '/login']) {
      expect(await router.navigateByUrl(target)).toBe(false);
      expect(router.url).toBe('/workout-sessions/100');
      expect(current(harness)).toBe(component);
    }
    expect(creation.cancelled).toBe(false);
    expect(dialog.open).not.toHaveBeenCalled();
    creation.flush(sessionSet());
    expect(await router.navigateByUrl('/workout-sessions/101')).toBe(false);
    http.expectOne(`${url}/100`).flush({ ...structuredClone(sessionDetail), activities: [
      { ...structuredClone(sessionDetail.activities[0]), sets: [sessionSet()] },
    ] });
    expect(await router.navigateByUrl('/workout-sessions/101')).toBe(true);
    http.expectOne(`${url}/101`).flush({ ...structuredClone(sessionDetail), id: 101 });
    expect(component.session()?.id).toBe(101);
    expect(current(harness)).toBe(component);
  });

  it('does not prompt for the legitimate recovery redirect to the stable session ID', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/workout-sessions');
    http.expectOne(`${url}/in-progress`).flush(sessionDetail);
    await harness.fixture.whenStable();
    http.expectOne(`${url}/100`).flush(sessionDetail);
    expect(TestBed.inject(Router).url).toBe('/workout-sessions/100');
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it.each(['IN_PROGRESS', 'CLOSED'] as const)('protects sidebar and browser back navigation for %s without changing the accepted session URL', async (status) => {
    const router = TestBed.inject(Router);
    router.setUpLocationChangeListener();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/workout-planning/9');
    http.expectOne('/api/users/me/workout-cycles/9').flush(cycleDetail);
    await harness.navigateByUrl('/workout-sessions/100');
    http.expectOne(`${url}/100`).flush(sessionDetail);
    const component = current(harness);
    if (status === 'CLOSED') component.editor.reconcile({ ...structuredClone(sessionDetail),
      status, closeReason: 'AUTO_EXPIRED', finishedAt: '2026-10-28T06:00:00Z' });
    component.editor.notes.setValue('Pendente');
    dialog.open.mockReturnValue(of(false));
    expect(await router.navigateByUrl('/workout-planning/9')).toBe(false);
    const cancelled = firstValueFrom(router.events.pipe(filter((event) => event instanceof NavigationCancel)));
    TestBed.inject(Location).back();
    await cancelled;
    await harness.fixture.whenStable();
    expect(router.url).toBe('/workout-sessions/100');
    expect(TestBed.inject(Location).path()).toBe('/workout-sessions/100');
    expect(component.editor.notes.value).toBe('Pendente');
    http.expectNone(`${url}/in-progress`);
    http.expectNone('/api/users/me/workout-cycles/9');
  });

  it('preserves mandatory authentication redirection even with drafts', async () => {
    const { component, router } = await openSession();
    component.editor.notes.setValue('Rascunho');
    TestBed.inject(AuthStateService).clear();
    expect(await router.navigateByUrl('/login')).toBe(true);
    expect(router.url).toBe('/login');
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('opens history from the sidebar without interpreting history as a numeric session ID', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/workout-sessions');
    http.expectOne(`${url}/in-progress`).flush(null);
    const menu = harness.fixture.nativeElement.querySelector('button[aria-label="Abrir menu"]') as HTMLButtonElement;
    menu.click();
    harness.detectChanges();
    const link = harness.fixture.nativeElement.querySelector('a[href="/workout-sessions/history"]') as HTMLAnchorElement;
    link.click();
    await harness.fixture.whenStable();
    http.expectOne((req) => req.url === url).flush(sessionHistory());
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/workout-sessions/history');
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(harness.fixture.nativeElement.querySelector('a[href="/workout-sessions"]').getAttribute('aria-current')).toBeNull();
    expect(harness.routeNativeElement!.textContent).toContain('Histórico de sessões');
    http.expectNone(`${url}/history`);
  });

  it.each(['MANUAL', 'AUTO_EXPIRED'] as const)('returns to history after a %s correction with filters and page preserved', async (closeReason) => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    await harness.navigateByUrl('/workout-sessions/history');
    http.expectOne((req) => req.url === url).flush(sessionHistory());
    const history = harness.fixture.debugElement.query(By.directive(WorkoutSessionHistoryComponent)).componentInstance as WorkoutSessionHistoryComponent;
    history.filtersForm.controls.startDate.setValue('2026-10-01');
    history.applyFilters();
    http.expectOne((req) => req.url === url).flush(sessionHistory());
    history.onPageChange({ pageIndex: 1, pageSize: 10, length: 30 });
    http.expectOne((req) => req.url === url).flush(sessionHistory([], 0, 10, 30));
    history.onPageChange({ pageIndex: 1, pageSize: 10, length: 30 });
    http.expectOne((req) => req.url === url).flush(sessionHistory(undefined, 1, 10, 30));
    history.openSession(100);
    await harness.fixture.whenStable();
    const saved = { ...structuredClone(sessionDetail), status: 'CLOSED', closeReason,
      finishedAt: '2026-10-28T06:00:00Z' } as const;
    http.expectOne(`${url}/100`).flush(saved);
    const component = current(harness);
    expect(router.url).toBe('/workout-sessions/100?from=history');
    expect(component.editor.activities()[0].rows).toHaveLength(0);
    component.editor.notes.setValue('Relato histórico corrigido');
    component.editor.saveNotes();
    const writing = http.expectOne(`${url}/100/notes`);
    expect(await router.navigateByUrl('/workout-sessions/history')).toBe(false);
    expect(writing.cancelled).toBe(false);
    writing.flush({ ...saved, notes: 'Relato histórico corrigido' });
    http.expectOne(`${url}/100`).flush({ ...saved, notes: 'Relato histórico corrigido' });
    component.returnToList();
    await harness.fixture.whenStable();
    const returned = http.expectOne((req) => req.url === url);
    expect(returned.request.params.get('startDate')).toBe('2026-10-01');
    expect(returned.request.params.get('page')).toBe('1');
    expect(returned.request.params.get('size')).toBe('10');
    returned.flush(sessionHistory(undefined, 1, 10, 30));
    expect(router.url).toBe('/workout-sessions/history');
    expect(dialog.open).not.toHaveBeenCalled();
    http.expectNone((req) => req.method === 'POST' || req.url.endsWith('/close'));
  });

  it.each(['MANUAL', 'AUTO_EXPIRED'] as const)('guards %s drafts on history exit and reused IDs without duplicate confirmations', async (closeReason) => {
    const { harness, component, router } = await openSession();
    component.editor.reconcile({ ...structuredClone(sessionDetail), status: 'CLOSED', closeReason,
      finishedAt: '2026-10-28T06:00:00Z' });
    component.editor.addSet(component.editor.activities()[0]);
    const form = component.editor.activities()[0].rows[0].form;
    form.controls.notes.setValue('Correção pendente');
    dialog.open.mockReturnValue(of(false));
    expect(await router.navigateByUrl('/workout-sessions/history')).toBe(false);
    expect(component.editor.activities()[0].rows[0].form).toBe(form);
    expect(dialog.open).toHaveBeenCalledTimes(1);
    http.expectNone((req) => req.url === url);
    dialog.open.mockReturnValue(of(true));
    expect(await router.navigateByUrl('/workout-sessions/101')).toBe(true);
    http.expectOne(`${url}/101`).flush({ ...structuredClone(sessionDetail), id: 101, status: 'CLOSED', closeReason,
      finishedAt: '2026-10-28T06:00:00Z' });
    expect(current(harness)).toBe(component);
    expect(component.editor.activities()[0].rows).toHaveLength(0);
    expect(component.editor.hasPending()).toBe(false);
    expect(dialog.open).toHaveBeenCalledTimes(2);
    component.editor.notes.setValue('Outro rascunho');
    expect(await router.navigateByUrl('/workout-sessions/history')).toBe(true);
    http.expectOne((req) => req.url === url).flush(sessionHistory());
    expect(dialog.open).toHaveBeenCalledTimes(3);
    expect(router.url).toBe('/workout-sessions/history');
  });

  it('preserves authentication redirection from historical editing', async () => {
    const { component, router } = await openSession();
    component.editor.reconcile({ ...structuredClone(sessionDetail), status: 'CLOSED', closeReason: 'MANUAL' });
    component.editor.notes.setValue('Correção pendente');
    TestBed.inject(AuthStateService).clear();
    expect(await router.navigateByUrl('/login')).toBe(true);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('reloads persisted execution when returning to a session and never repeats the creation', async () => {
    const { harness, component, router } = await openSession();
    const activity = component.editor.activities()[0];
    activity.rows[0].form.controls.actualReps.setValue(8);
    component.editor.saveSet(activity, activity.rows[0]);
    const persisted = sessionSet({ id: 901 });
    http.expectOne(`${url}/100/activities/200/sets`).flush(persisted);
    expect(component.editor.busy()).toBe(true);
    const saved = { ...structuredClone(sessionDetail), activities: [
      { ...structuredClone(sessionDetail.activities[0]), sets: [persisted] },
    ] };
    http.expectOne(`${url}/100`).flush(saved);
    expect(component.editor.operation()).toBeNull();
    expect(component.editor.busy()).toBe(false);
    expect(component.editor.needsRefresh()).toBe(false);
    expect(component.editor.hasPending()).toBe(false);
    expect(await router.navigateByUrl('/workout-planning/9')).toBe(true);
    expect(router.url).toBe('/workout-planning/9');
    harness.detectChanges();
    http.expectOne('/api/users/me/workout-cycles/9').flush(cycleDetail);
    expect(dialog.open).not.toHaveBeenCalled();
    expect(await router.navigateByUrl('/workout-sessions/100')).toBe(true);
    expect(router.url).toBe('/workout-sessions/100');
    harness.detectChanges();
    http.expectOne(`${url}/100`).flush(saved);
    expect(current(harness)).not.toBe(component);
    expect(current(harness).editor.activities()[0].rows[0].persisted?.id).toBe(901);
    expect(current(harness).editor.activities()[0].rows.filter((row) => row.persisted?.id === 901)).toHaveLength(1);
    expect(current(harness).editor.hasPending()).toBe(false);
    http.expectNone((request) => request.method === 'POST');
  });
});
