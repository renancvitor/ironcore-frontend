import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { WorkoutSessionsService } from '../../workout-sessions/workout-sessions.service';
import { sessionDetail } from '../../workout-sessions/workout-sessions.testing';
import { WorkoutPlanningService } from '../workout-planning.service';
import { GetWorkoutCycleDetailResponse } from '../workout-planning.models';
import { cycleDetail } from '../workout-planning.testing';
import { WorkoutCycleDetailComponent } from './workout-cycle-detail.component';

describe('WorkoutCycleDetailComponent', () => {
  let fixture: ComponentFixture<WorkoutCycleDetailComponent>;
  const service = { getWorkoutCycleDetail: vi.fn(), getTrainingGoals: vi.fn(() => of([])) };
  let routeId: string;
  let editQuery: string;
  let fromQuery: string;

  beforeEach(async () => {
    routeId = '9';
    editQuery = '';
    fromQuery = '';
    service.getWorkoutCycleDetail.mockReset().mockReturnValue(of(cycleDetail));
    await TestBed.configureTestingModule({
      imports: [WorkoutCycleDetailComponent],
      providers: [
        provideRouter([]),
        { provide: WorkoutSessionsService, useValue: {} },
        { provide: WorkoutPlanningService, useValue: service },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get queryParamMap() {
                return convertToParamMap({ edit: editQuery, from: fromQuery });
              },
              get paramMap() {
                return convertToParamMap({ id: routeId });
              },
            },
          },
        },
      ],
    }).compileComponents();
  });

  async function create(): Promise<void> {
    fixture = TestBed.createComponent(WorkoutCycleDetailComponent);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it.each(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const)(
    'opens list-requested editing only if allowed for %s',
    async (status) => {
      editQuery = 'true';
      service.getWorkoutCycleDetail.mockReturnValue(of({ ...cycleDetail, workoutStatus: status }));
      await create();
      const allowed = status === 'NOT_STARTED' || status === 'IN_PROGRESS';
      expect(fixture.componentInstance.editing()).toBe(allowed);
      expect(!!fixture.nativeElement.querySelector('app-workout-cycle-form')).toBe(allowed);
    },
  );

  it('shows loading and ignores duplicate retry requests', async () => {
    const request = new Subject<GetWorkoutCycleDetailResponse>();
    service.getWorkoutCycleDetail.mockReturnValue(request);
    await create();
    expect(fixture.nativeElement.querySelector('app-loading')).not.toBeNull();
    fixture.componentInstance.loadCycle();
    expect(service.getWorkoutCycleDetail).toHaveBeenCalledExactlyOnceWith(9);
    request.next(cycleDetail);
    request.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
  });

  it('renders days by weekDay and sortOrder, preserving activity and muscle order', async () => {
    await create();
    const text = fixture.nativeElement.textContent;
    for (const value of [
      'Força A',
      'Em andamento',
      'Objetivo do backend',
      '3 mês(es)',
      '01/10/2026',
      '31/12/2026',
      'Notas do ciclo',
      'Segunda linha',
      'Sexta-feira',
      'Segunda-feira',
      'Peitoral',
      'Tríceps',
      '22.5 kg',
      'Carga confortável',
      '15 min',
      '2.5 km',
      'Moderada',
      '90 s',
      'Execução controlada',
      'Séries',
      'Repetições mínimas',
      'Repetições máximas',
    ]) {
      expect(text).toContain(value);
    }
    const titles = (selector: string) =>
      Array.from(fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>).map(
        (el) => el.textContent!.trim(),
      );
    expect(titles('.ic-workout-detail__days h3')).toEqual(['Treino A', 'Treino B']);
    expect(titles('h4')).toEqual(['Exercício B', 'Exercício A']);
    expect(titles('.ic-workout-detail__muscles li')).toEqual(['Peitoral', 'Tríceps']);
    expect(text).toContain('Nenhuma atividade neste dia de treino.');
    expect(text).not.toContain('Origem');
  });

  it('renders a cycle without days', async () => {
    service.getWorkoutCycleDetail.mockReturnValue(of({ ...cycleDetail, days: [] }));
    await create();
    expect(fixture.nativeElement.textContent).toContain('Nenhum dia de treino neste ciclo.');
    expect(fixture.nativeElement.textContent).toContain('Força A');
  });

  it('renders nullable general fields and hides absent prescriptions and notes', async () => {
    service.getWorkoutCycleDetail.mockReturnValue(
      of({
        ...cycleDetail,
        notes: null,
        startDate: null,
        endDate: null,
        desiredDurationMonths: null,
        days: [{ ...cycleDetail.days[0], activities: [cycleDetail.days[0].activities[1]] }],
      }),
    );
    await create();
    expect(
      fixture.nativeElement.querySelector('.ic-workout-detail__fields').textContent.match(/—/g),
    ).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('.ic-workout-detail__notes')).toBeNull();
    expect(fixture.nativeElement.querySelector('.ic-workout-detail__muscles')).toBeNull();
    expect(
      fixture.nativeElement.querySelectorAll('.ic-workout-detail__prescription > div'),
    ).toHaveLength(0);
    expect(fixture.nativeElement.textContent).not.toMatch(/null|undefined/);
  });

  it('renders a partial prescription including zero values', async () => {
    service.getWorkoutCycleDetail.mockReturnValue(
      of({
        ...cycleDetail,
        days: [
          {
            ...cycleDetail.days[0],
            activities: [
              {
                ...cycleDetail.days[0].activities[1],
                repRangeMin: 5,
                restSeconds: 0,
                targetLoadKg: 0,
              },
            ],
          },
        ],
      }),
    );
    await create();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Repetições mínimas');
    expect(text).toContain('0 kg');
    expect(text).toContain('0 s');
    expect(text).not.toContain('Repetições máximas');
  });

  it.each([{}, { error: { message: 'Ciclo não encontrado.' } }])(
    'shows error and recovers with retry: %j',
    async (error) => {
      service.getWorkoutCycleDetail.mockReturnValueOnce(throwError(() => error));
      await create();
      expect(fixture.componentInstance.loading()).toBe(false);
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
        error.error?.message ?? 'Não foi possível carregar o ciclo de treino.',
      );
      fixture.nativeElement.querySelector('[role="alert"] button').click();
      fixture.detectChanges();
      expect(service.getWorkoutCycleDetail).toHaveBeenCalledTimes(2);
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Força A');
    },
  );

  it('returns to the catalog from the accessible header button, including on error', async () => {
    service.getWorkoutCycleDetail.mockReturnValueOnce(throwError(() => new Error('offline')));
    await create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.nativeElement.querySelector('button[aria-label="Voltar aos ciclos de treino"]').click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/workout-planning']);
  });

  it.each([false, true])(
    'returns to Home with its accessible label when from=home (error: %s)',
    async (error) => {
      fromQuery = 'home';
      if (error)
        service.getWorkoutCycleDetail.mockReturnValueOnce(throwError(() => new Error('offline')));
      await create();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      fixture.nativeElement.querySelector('button[aria-label="Voltar ao início"]').click();
      expect(navigate).toHaveBeenCalledExactlyOnceWith(['/']);
    },
  );

  it('uses the catalog for an unrecognized origin', async () => {
    fromQuery = 'https://example.com';
    await create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.nativeElement.querySelector('button[aria-label="Voltar aos ciclos de treino"]').click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/workout-planning']);
  });

  it.each(['0', '-1', 'abc', '1.5', '9007199254740992'])(
    'redirects invalid cycle ID %s without a request',
    async (id) => {
      routeId = id;
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      await create();
      expect(service.getWorkoutCycleDetail).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/workout-planning']);
    },
  );

  it.each([
    ['SUNDAY', [3, 1, 4, 2]],
    ['MONDAY', [4, 2, 3, 1]],
    ['TUESDAY', [2, 3, 1, 4]],
    ['WEDNESDAY', [2, 3, 1, 4]],
    ['THURSDAY', [2, 3, 1, 4]],
    ['FRIDAY', [2, 3, 1, 4]],
    ['SATURDAY', [2, 3, 1, 4]],
  ] as const)(
    'orders days circularly when week starts on %s',
    async (weekStartsOn, expectedIds) => {
      const days = [
        { id: 1, title: 'Domingo B', weekDay: 'SUNDAY' as const, sortOrder: 2, activities: [] },
        { id: 2, title: 'Sábado', weekDay: 'SATURDAY' as const, sortOrder: 1, activities: [] },
        { id: 3, title: 'Domingo A', weekDay: 'SUNDAY' as const, sortOrder: 1, activities: [] },
        { id: 4, title: 'Segunda', weekDay: 'MONDAY' as const, sortOrder: 1, activities: [] },
      ];

      service.getWorkoutCycleDetail.mockReturnValue(of({ ...cycleDetail, weekStartsOn, days }));

      await create();

      expect(fixture.componentInstance.orderedDays().map((day) => day.id)).toEqual(expectedIds);

      expect(fixture.componentInstance.cycle()?.days).toEqual(days);
      expect(days.map((day) => [day.id, day.weekDay, day.sortOrder])).toEqual([
        [1, 'SUNDAY', 2],
        [2, 'SATURDAY', 1],
        [3, 'SUNDAY', 1],
        [4, 'MONDAY', 1],
      ]);
    },
  );
});

describe('WorkoutCycleDetailComponent session start with HTTP', () => {
  let fixture: ComponentFixture<WorkoutCycleDetailComponent>;
  let component: WorkoutCycleDetailComponent;
  let http: HttpTestingController;
  const cycleUrl = '/api/users/me/workout-cycles/9';
  const sessionsUrl = '/api/users/me/workout-sessions';
  const dialog = { open: vi.fn() };
  const toast = { success: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    dialog.open.mockReturnValue(of(true));
    await TestBed.configureTestingModule({
      imports: [WorkoutCycleDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '' },
        { provide: DialogService, useValue: dialog },
        { provide: ToastService, useValue: toast },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '9' }) } },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => http.verify());

  function create(data = structuredClone(cycleDetail)) {
    fixture = TestBed.createComponent(WorkoutCycleDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(cycleUrl).flush(data);
    fixture.detectChanges();
  }
  function startButton(): HTMLButtonElement | undefined {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.getAttribute('aria-label') === 'Iniciar sessão');
  }

  it.each(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const)(
    'offers session start only for an eligible day in %s',
    (workoutStatus) => {
      create({ ...cycleDetail, workoutStatus });
      expect(!!startButton()).toBe(workoutStatus === 'IN_PROGRESS');
      expect(component.canStartSession(cycleDetail.days[1])).toBe(false);
      component.startSession(cycleDetail.days[1]);
      component.startSession({ ...cycleDetail.days[0], id: 999 });
      if (workoutStatus !== 'IN_PROGRESS') component.startSession(cycleDetail.days[0]);
      http.expectNone(sessionsUrl);
    },
  );

  it('starts the selected day once and blocks all conflicting planning operations', () => {
    create();
    const before = component.cycle();
    expect(startButton()!.type).toBe('button');
    expect(startButton()!.querySelector('mat-icon')!.textContent!.trim()).toBe('play_circle');
    startButton()!.click();
    fixture.detectChanges();
    const request = http.expectOne(sessionsUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      workoutCycleId: 9,
      workoutDayId: cycleDetail.days[0].id,
    });
    expect(fixture.nativeElement.textContent).toContain('Iniciando ou recuperando sessão');
    expect(fixture.nativeElement.querySelector('section').getAttribute('aria-busy')).toBe('true');
    for (const button of fixture.nativeElement.querySelectorAll('button'))
      expect(button.disabled).toBe(true);
    component.startSession(cycleDetail.days[0]);
    component.startEdit();
    component.completeCycle();
    component.cancelCycle();
    component.openDayForm('create');
    component.openDayForm('reorder', cycleDetail.days[0]);
    component.deleteDay(cycleDetail.days[0]);
    component.openActivitySelector(cycleDetail.days[0]);
    component.openActivityForm('reorder', cycleDetail.days[0], cycleDetail.days[0].activities[0]);
    component.deleteActivity(cycleDetail.days[0], cycleDetail.days[0].activities[0]);
    component.saveDay();
    component.saveActivity();
    component.backToCycles();
    component.loadCycle();
    http.expectNone(() => true);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    expect(dialog.open).not.toHaveBeenCalled();
    request.flush({ id: 100, status: 'IN_PROGRESS' }, { status: 201, statusText: 'Created' });
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledExactlyOnceWith([
      '/workout-sessions',
      100,
    ]);
    expect(component.cycle()).toEqual(before);
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('Sessão de treino iniciada com sucesso.');
  });

  it('uses the chosen eligible day rather than the first day or the current weekday', () => {
    const data = structuredClone(cycleDetail);
    data.days[1].activities = structuredClone(data.days[0].activities);
    create(data);
    component.startSession(data.days[1]);
    const request = http.expectOne(sessionsUrl);
    expect(request.request.body).toEqual({ workoutCycleId: 9, workoutDayId: data.days[1].id });
    request.flush({ id: 101 });
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/workout-sessions', 101]);
  });

  it.each([
    'editing',
    'saving',
    'loading',
    'daySaving',
    'daysLoading',
    'confirmingDelete',
    'activitySaving',
    'activitiesLoading',
    'confirmingActivityDelete',
  ] as const)('blocks session start while %s is active', (state) => {
    create();
    component[state].set(true);
    component.startSession(cycleDetail.days[0]);
    expect(component.sessionStartBusy()).toBe(false);
    http.expectNone(sessionsUrl);
  });

  it('blocks session start during forms and lifecycle confirmation', () => {
    create();
    component.dayMode.set('reorder');
    component.startSession(cycleDetail.days[0]);
    component.dayMode.set(null);
    component.activityMode.set('select');
    component.startSession(cycleDetail.days[0]);
    component.activityMode.set(null);
    component.lifecycleState.set('confirming');
    component.startSession(cycleDetail.days[0]);
    component.lifecycleState.set('saving');
    component.startSession(cycleDetail.days[0]);
    http.expectNone(sessionsUrl);
  });

  it('recovers a conflicting open session and asks before navigating', () => {
    create();
    const confirmed = new Subject<boolean>();
    dialog.open.mockReturnValue(confirmed);
    component.startSession(cycleDetail.days[0]);
    http
      .expectOne(sessionsUrl)
      .flush(
        { message: 'Já existe uma sessão em andamento para a pessoa.' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(component.sessionStartBusy()).toBe(true);
    http.expectOne(`${sessionsUrl}/in-progress`).flush(sessionDetail);
    expect(dialog.open).toHaveBeenCalledWith(
      expect.objectContaining({ primaryAction: 'Continuar sessão' }),
    );
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    component.startSession(cycleDetail.days[0]);
    http.expectNone(sessionsUrl);
    confirmed.next(true);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/workout-sessions', 100]);
    http.expectOne(cycleUrl).flush(cycleDetail);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('does not mistake a planning conflict for an existing session or retry POST automatically', () => {
    create();
    component.startSession(cycleDetail.days[0]);
    http
      .expectOne(sessionsUrl)
      .flush(
        { message: 'Prescrição foi alterada. Recarregue a ficha.' },
        { status: 409, statusText: 'Conflict' },
      );
    http.expectOne(`${sessionsUrl}/in-progress`).flush(
      { message: 'Sessão de treino em andamento não encontrada.' },
      { status: 404, statusText: 'Not Found' },
    );
    expect(dialog.open).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Prescrição foi alterada'),
        primaryAction: 'Ok',
      }),
    );
    http.expectOne(cycleUrl).flush(cycleDetail);
    http.expectNone(sessionsUrl);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it.each([0, 500])(
    'keeps uncertain opening error %s in recovery mode until a successful read allows retry',
    (status) => {
      create();
      component.startSession(cycleDetail.days[0]);
      const request = http.expectOne(sessionsUrl);
      if (status === 0) request.error(new ProgressEvent('error'));
      else request.flush({}, { status, statusText: 'Error' });
      http.expectOne(`${sessionsUrl}/in-progress`).error(new ProgressEvent('error'));
      fixture.detectChanges();
      expect(component.sessionNeedsRecovery()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Verificar sessão');
      expect(startButton()).toBeUndefined();
      const recoveryButton = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).find((button) => button.textContent?.trim() === 'Verificar sessão')!;
      recoveryButton.click();
      http.expectNone(sessionsUrl);
      http.expectOne(`${sessionsUrl}/in-progress`).flush(
        { message: 'Sessão de treino em andamento não encontrada.' },
        { status: 404, statusText: 'Not Found' },
      );
      expect(component.sessionNeedsRecovery()).toBe(false);
      fixture.detectChanges();
      expect(startButton()).toBeDefined();
      component.startSession(cycleDetail.days[0]);
      http.expectOne(sessionsUrl).flush({ id: 100 });
    },
  );

  it.each([400, 401, 403, 404])(
    'handles start error %s without changing cycle lifecycle',
    (status) => {
      create();
      component.startSession(cycleDetail.days[0]);
      http
        .expectOne(sessionsUrl)
        .flush({ message: 'Recusa da API' }, { status, statusText: 'Error' });
      if (status === 400 || status === 404) http.expectOne(cycleUrl).flush(cycleDetail);
      expect(component.sessionStartBusy()).toBe(false);
      expect(component.cycle()?.workoutStatus).toBe('IN_PROGRESS');
      expect(toast.success).not.toHaveBeenCalled();
      if (status !== 401)
        expect(dialog.open).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Recusa da API' }),
        );
      else expect(dialog.open).not.toHaveBeenCalled();
      http.expectNone(`${sessionsUrl}/in-progress`);
    },
  );
});
