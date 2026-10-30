import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { API_BASE_URL } from '../../../../core/http/api-base-url.token';
import { DialogService } from '../../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { WeekDay, WorkoutStatus } from '../../../workout-planning/workout-planning.models';
import { TodayWorkoutsCardComponent } from './today-workouts-card.component';

describe('TodayWorkoutsCardComponent', () => {
  let fixture: ComponentFixture<TodayWorkoutsCardComponent>;
  let http: HttpTestingController;
  const cyclesUrl = '/api/users/me/workout-cycles';
  const sessionsUrl = '/api/users/me/workout-sessions';
  const dialog = { open: vi.fn(() => of(false)) };
  const toast = { success: vi.fn() };
  const weekDays: WeekDay[] = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];
  const day = (id = 10, weekDay: WeekDay = 'THURSDAY', activities = true) => ({
    id,
    weekDay,
    title: `Treino ${id}`,
    sortOrder: id,
    activities: activities ? [{ id: 1 }] : [],
  });
  const cycle = (id = 1, days = [day()], workoutStatus: WorkoutStatus = 'IN_PROGRESS') => ({
    id,
    name: `Ciclo ${id}`,
    workoutStatus,
    days,
  });
  const session = {
    id: 50,
    status: 'IN_PROGRESS',
    workoutDayTitleSnapshot: 'Treino aberto',
    workoutCycleNameSnapshot: 'Ciclo aberto',
  };
  const page = (content: unknown[], index = 0, last = true) => ({
    cycles: {
      content,
      page: index,
      size: 20,
      totalElements: content.length,
      totalPages: last ? index + 1 : index + 2,
      last,
    },
  });
  const list = (index = 0) =>
    http.expectOne((req) => req.url === cyclesUrl && req.params.get('page') === `${index}`);
  const current = () => http.expectOne(`${sessionsUrl}/in-progress`);
  const text = () => (fixture.nativeElement as HTMLElement).textContent!;
  const start = () =>
    fixture.componentInstance.startSession(fixture.componentInstance.workouts()[0]);
  const load = (days = [day()], active: typeof session | null = null) => {
    current().flush(active);
    list().flush(page([cycle(1, days)]));
    http.expectOne(`${cyclesUrl}/1`).flush({ ...cycle(1, days), weekStartsOn: 'FRIDAY' });
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 29, 0, 30));
    dialog.open.mockReset().mockReturnValue(of(false));
    toast.success.mockReset();
    await TestBed.configureTestingModule({
      imports: [TodayWorkoutsCardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '' },
        { provide: DialogService, useValue: dialog },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(TodayWorkoutsCardComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads with busy state and prevents starts until both lookups finish', () => {
    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeTruthy();
    list().flush(page([cycle()]));
    http.expectOne(`${cyclesUrl}/1`).flush(cycle());
    start();
    http.expectNone(sessionsUrl);
    current().flush(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-busy="false"]')).toBeTruthy();
  });

  it.each(weekDays)(
    'selects only the local weekday %s, independent of cycle week start',
    (weekDay) => {
      vi.setSystemTime(new Date(2026, 9, 25 + weekDays.indexOf(weekDay), 0, 30));
      fixture.componentInstance.updateToday();
      const days = weekDays.map((value, id) => day(id + 10, value));
      load(days);
      expect(fixture.componentInstance.workouts().map((item) => item.day.weekDay)).toEqual([
        weekDay,
      ]);
      expect(fixture.nativeElement.querySelectorAll('li')).toHaveLength(1);
    },
  );

  it('traverses active pages, ignores other statuses and shows all matching days with cycle names', () => {
    current().flush(null);
    const first = list();
    expect(first.request.params.get('workoutStatus')).toBe('IN_PROGRESS');
    first.flush(
      page(
        [
          cycle(),
          cycle(3, [day()], 'NOT_STARTED'),
          cycle(4, [day()], 'COMPLETED'),
          cycle(5, [day()], 'CANCELLED'),
        ],
        0,
        false,
      ),
    );
    list(1).flush(page([cycle(2)], 1));
    http.expectOne(`${cyclesUrl}/1`).flush(cycle(1, [day(10), day(11), day(12, 'FRIDAY')]));
    http.expectOne(`${cyclesUrl}/2`).flush(cycle(2, [day(20)]));
    fixture.detectChanges();
    expect(fixture.componentInstance.workouts().map((item) => item.day.id)).toEqual([10, 11, 20]);
    expect(text()).toContain('Ciclo 1');
    expect(text()).toContain('Ciclo 2');
    http.expectNone((req) => /\/(3|4|5)$/.test(req.url));
  });

  it('ignores a cycle that became inactive between listing and fetching detail', () => {
    current().flush(null);
    list().flush(page([cycle()]));
    http.expectOne(`${cyclesUrl}/1`).flush(cycle(1, [day()], 'COMPLETED'));
    fixture.detectChanges();
    expect(text()).toContain('Nenhum treino planejado para hoje.');
  });

  it('shows an empty message when there are no active cycles and does not fetch other statuses', () => {
    current().flush(null);
    list().flush(page([]));
    fixture.detectChanges();
    expect(text()).toContain('Nenhum treino planejado para hoje.');
    http.expectNone(() => true);
  });

  it.each([{ days: [] }, { days: [day(10, 'FRIDAY')] }])(
    'shows a discreet empty message without suggesting other days ($days)',
    ({ days }) => {
      load(days);
      expect(text()).toContain('Nenhum treino planejado para hoje.');
      expect(fixture.nativeElement.querySelector('button, select, input')).toBeNull();
    },
  );

  it('shows empty workouts without offering a start action', () => {
    load([day(10, 'THURSDAY', false)]);
    expect(text()).toContain('Treino sem atividades.');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    start();
    http.expectNone(sessionsUrl);
  });

  it('highlights and continues an existing session, blocking all new starts', () => {
    load([day()], session);
    expect(text()).toContain('Sessão em andamento');
    expect(text()).toContain('Treino aberto');
    const buttons = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].getAttribute('aria-label')).toBe('Continuar sessão: Treino aberto');
    expect(buttons[0].querySelector('mat-icon')?.textContent).toBe('arrow_outward');
    expect(buttons[1].querySelector('mat-icon')?.textContent).toBe('play_circle');
    expect(buttons[1].disabled).toBe(true);
    buttons[0].click();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/workout-sessions', 50]);
    start();
    http.expectNone(sessionsUrl);
  });

  it('starts successfully, blocks repeated clicks and navigates to the created session', () => {
    load();
    start();
    start();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Iniciando sessão: Treino 10"]'),
    ).toBeTruthy();
    const pending = http.expectOne(sessionsUrl);
    expect(pending.request.body).toEqual({ workoutCycleId: 1, workoutDayId: 10 });
    expect(pending.request.method).toBe('POST');
    pending.flush({ id: 60, status: 'IN_PROGRESS' });
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/workout-sessions', 60]);
    expect(toast.success).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.session()?.id).toBe(60);
    start();
    http.expectNone(sessionsUrl);
  });

  it('permits another execution of the same day when no session is open, without querying history', () => {
    load();
    start();
    http.expectOne(sessionsUrl).flush({ id: 60 });
    fixture.componentInstance.loadSession();
    current().flush(null);
    start();
    http.expectOne(sessionsUrl).flush({ id: 61 });
    expect(TestBed.inject(Router).navigate).toHaveBeenLastCalledWith(['/workout-sessions', 61]);
  });

  it('blocks starts on session lookup failure and supports retry', () => {
    list().flush(page([cycle()]));
    http.expectOne(`${cyclesUrl}/1`).flush(cycle());
    current().flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(text()).toContain('Não foi possível consultar');
    start();
    http.expectNone(sessionsUrl);
    fixture.componentInstance.loadSession();
    current().flush(null);
    expect(fixture.componentInstance.startBlocked()).toBe(false);
  });

  it.each(['list', 'page', 'detail'])(
    'shows planning errors without displaying partial results (%s)',
    (step) => {
      current().flush(session);
      if (step === 'page') list().flush(page([cycle()], 0, false));
      if (step === 'detail') list().flush(page([cycle()]));
      const pending =
        step === 'detail' ? http.expectOne(`${cyclesUrl}/1`) : list(step === 'page' ? 1 : 0);
      pending.flush(null, { status: 500, statusText: 'Error' });
      fixture.detectChanges();
      expect(text()).toContain('Não foi possível carregar os treinos');
      expect(
        fixture.nativeElement.querySelector('button[aria-label^="Continuar sessão"]'),
      ).toBeTruthy();
      expect(text()).not.toContain('Nenhum treino planejado');
      fixture.componentInstance.loadPlanning();
      list().flush(page([]));
      expect(fixture.componentInstance.planningError()).toBe(false);
    },
  );

  it.each([409, 0, 500])(
    'recovers a session after uncertain start (%s), retaining it even if the dialog is dismissed',
    (status) => {
      load();
      start();
      http.expectOne(sessionsUrl).flush(null, { status, statusText: 'Error' });
      current().flush(session);
      if (status === 409) list().flush(page([]));
      expect(fixture.componentInstance.session()?.id).toBe(50);
      expect(toast.success).not.toHaveBeenCalled();
      start();
      http.expectNone(sessionsUrl);
      fixture.componentInstance.continueSession();
      expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/workout-sessions', 50]);
    },
  );

  it('continues the recovered session when the dialog is confirmed', () => {
    dialog.open.mockReturnValue(of(true));
    load();
    start();
    http.expectOne(sessionsUrl).flush(null, { status: 500, statusText: 'Error' });
    current().flush(session);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/workout-sessions', 50]);
  });

  it('retries only recovery while the POST outcome remains unknown, then allows a deliberate new start', () => {
    load();
    start();
    http.expectOne(sessionsUrl).flush(null, { status: 0, statusText: 'Unknown' });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Verificando sessão: Treino 10"]'),
    ).toBeTruthy();
    current().flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    const verifyButton = fixture.nativeElement.querySelector(
      'button[aria-label="Verificar sessão: Treino 10"]',
    ) as HTMLButtonElement;
    expect(verifyButton).toBeTruthy();
    expect(verifyButton.querySelector('mat-icon')?.textContent?.trim()).toBe('sync');
    expect(verifyButton.disabled).toBe(false);
    start();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Verificando sessão: Treino 10"]'),
    ).toBeTruthy();
    http.expectNone(sessionsUrl);
    current().flush(null);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Iniciar sessão: Treino 10"]'),
    ).toBeTruthy();
    expect(fixture.componentInstance.startingDayId()).toBeNull();
    start();
    http.expectOne(sessionsUrl).flush({ id: 60 });
  });

  it('keeps all start actions busy until recovery dialog resolves', () => {
    const decision = new Subject<boolean>();
    dialog.open.mockReturnValue(decision);
    load();
    start();
    http.expectOne(sessionsUrl).flush(null, { status: 500, statusText: 'Error' });
    current().flush(null);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Verificando sessão: Treino 10"]'),
    ).toBeTruthy();
    start();
    http.expectNone(sessionsUrl);
    expect(fixture.componentInstance.startBlocked()).toBe(true);
    decision.next(false);
    expect(fixture.componentInstance.startBlocked()).toBe(false);
  });

  it.each([400, 404])('refreshes stale planning on rejected start (%s)', (status) => {
    load();
    start();
    http
      .expectOne(sessionsUrl)
      .flush({ message: 'Planejamento alterado' }, { status, statusText: 'Error' });
    expect(dialog.open).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Planejamento alterado' }),
    );
    list().flush(page([]));
    expect(fixture.componentInstance.workouts()).toEqual([]);
    http.expectNone(`${sessionsUrl}/in-progress`);
  });

  it('leaves authentication errors to the existing interceptor', () => {
    load();
    start();
    http.expectOne(sessionsUrl).flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(dialog.open).not.toHaveBeenCalled();
    expect(fixture.componentInstance.startingDayId()).toBeNull();
  });

  it('rechecks the date before starting when Home was left open overnight', () => {
    load();
    vi.setSystemTime(new Date(2026, 9, 30, 0, 1));
    start();
    expect(fixture.componentInstance.workouts()).toEqual([]);
    http.expectNone(sessionsUrl);
  });

  it.each(['focus', 'visibilitychange'])(
    'updates displayed days after the browser resumes (%s)',
    (event) => {
      load([day(), day(11, 'FRIDAY')]);
      vi.setSystemTime(new Date(2026, 9, 30, 0, 1));
      (event === 'focus' ? window : document).dispatchEvent(new Event(event));
      current().flush(null);
      fixture.detectChanges();
      expect(fixture.componentInstance.workouts().map((item) => item.day.id)).toEqual([11]);
      expect(text()).not.toContain('Treino 10');
    },
  );

  it.each(['focus', 'visibilitychange'])(
    'revalidates an externally closed session when resuming (%s) and allows a new start',
    (event) => {
      load([day()], session);
      (event === 'focus' ? window : document).dispatchEvent(new Event(event));
      expect(fixture.componentInstance.startBlocked()).toBe(true);
      current().flush(null);
      fixture.detectChanges();
      expect(text()).not.toContain('Treino aberto');
      expect(fixture.componentInstance.startBlocked()).toBe(false);
      start();
      http.expectOne(sessionsUrl).flush({ id: 60 });
    },
  );

  it('discovers a session opened externally and blocks new starts', () => {
    load();
    window.dispatchEvent(new Event('focus'));
    current().flush(session);
    fixture.detectChanges();
    expect(text()).toContain('Treino aberto');
    start();
    http.expectNone(sessionsUrl);
  });

  it('ignores resume events while hidden and deduplicates pending session lookups', () => {
    load();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    http.expectNone(`${sessionsUrl}/in-progress`);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    current().flush(null);
  });

  it('keeps starts blocked if resume revalidation fails and allows a lookup retry', () => {
    load([day()], session);
    window.dispatchEvent(new Event('focus'));
    current().flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(text()).toContain('Não foi possível consultar');
    start();
    http.expectNone(sessionsUrl);
    fixture.componentInstance.loadSession();
    current().flush(null);
    expect(fixture.componentInstance.startBlocked()).toBe(false);
  });

  it('does not revalidate concurrently with a pending start, recovery lookup or recovery dialog', () => {
    const decision = new Subject<boolean>();
    dialog.open.mockReturnValue(decision);
    load();
    start();
    window.dispatchEvent(new Event('focus'));
    http.expectNone(`${sessionsUrl}/in-progress`);
    http.expectOne(sessionsUrl).flush(null, { status: 500, statusText: 'Error' });
    const recovering = current();
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    http.expectNone(`${sessionsUrl}/in-progress`);
    recovering.flush(null);
    window.dispatchEvent(new Event('focus'));
    http.expectNone(`${sessionsUrl}/in-progress`);
    decision.next(false);
    window.dispatchEvent(new Event('focus'));
    current().flush(null);
  });

  it('updates automatically at local midnight while Home remains visible', () => {
    load();
    fixture.destroy();
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(2026, 9, 29, 23, 59, 59));
    fixture = TestBed.createComponent(TodayWorkoutsCardComponent);
    fixture.detectChanges();
    load([day(), day(11, 'FRIDAY')]);
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(fixture.componentInstance.workouts().map((item) => item.day.id)).toEqual([11]);
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels pending requests when destroyed', () => {
    const sessionRequest = current();
    const planningRequest = list();
    fixture.destroy();
    expect(sessionRequest.cancelled).toBe(true);
    expect(planningRequest.cancelled).toBe(true);
  });
});
