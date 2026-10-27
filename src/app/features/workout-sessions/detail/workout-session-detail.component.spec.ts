import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { GetWorkoutSessionDetailResponse } from '../workout-sessions.models';
import { sessionDetail } from '../workout-sessions.testing';
import { WorkoutSessionDetailComponent } from './workout-session-detail.component';

describe('WorkoutSessionDetailComponent with HTTP', () => {
  let fixture: ComponentFixture<WorkoutSessionDetailComponent>;
  let component: WorkoutSessionDetailComponent;
  let http: HttpTestingController;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  const url = '/api/users/me/workout-sessions';
  const dialog = { open: vi.fn() };
  const toast = { success: vi.fn(), info: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    dialog.open.mockReturnValue(of(true));
    params = new BehaviorSubject(convertToParamMap({ id: '100' }));
    await TestBed.configureTestingModule({
      imports: [WorkoutSessionDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '' },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: DialogService, useValue: dialog },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  function create() {
    fixture = TestBed.createComponent(WorkoutSessionDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }
  function load(data: GetWorkoutSessionDetailResponse = structuredClone(sessionDetail)) {
    create();
    http.expectOne(`${url}/100`).flush(data);
    fixture.detectChanges();
  }
  function button(text: string): HTMLButtonElement {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((element) => element.textContent?.trim() === text)!;
  }

  it('loads independently on refresh and renders only historical prescriptions', () => {
    create();
    expect(fixture.nativeElement.querySelector('app-loading')).not.toBeNull();
    component.loadSession();
    const request = http.expectOne(`${url}/100`);
    request.flush(sessionDetail);
    fixture.detectChanges();
    for (const text of [
      'Ciclo preservado',
      'Treino preservado',
      'Exercício preservado',
      'Prescrição planejada',
      'não representam execução registrada',
      'Carga moderada',
      'Orientação histórica',
      '22.5 kg',
      '15 min',
      '2.5 km',
      '60 s',
      'Moderada',
      '27/10/2026',
    ]) {
      expect(fixture.nativeElement.textContent).toContain(text);
    }
    expect(fixture.nativeElement.querySelectorAll('input, textarea, select')).toHaveLength(0);
    expect(component.session()?.activities[0].sets).toEqual([]);
    expect(component.session()?.activities[0].actualDurationMinutes).toBeNull();
    http.expectNone(
      (request) => request.url.includes('workout-cycles') || request.url.includes('exercise'),
    );
    fixture.destroy();
    create();
    http.expectOne(`${url}/100`).flush(sessionDetail);
  });

  it('renders a snapshot after all optional origin references were removed', () => {
    const data = structuredClone(sessionDetail);
    data.workoutCycleId = null;
    data.workoutDayId = null;
    data.activities[0].workoutActivityId = null;
    data.activities[0].exerciseId = null;
    load(data);
    expect(fixture.nativeElement.textContent).toContain('Ciclo preservado');
    expect(fixture.nativeElement.textContent).toContain('Exercício preservado');
    expect(button('Ver ciclo de origem')).toBeUndefined();
    component.openSourceCycle();
    http.expectNone(() => true);
  });

  it('keeps missing prescriptions absent and preserves zero values', () => {
    const data = structuredClone(sessionDetail);
    Object.assign(data.activities[0], {
      plannedSetsSnapshot: null,
      plannedRepRangeMinSnapshot: null,
      plannedRepRangeMaxSnapshot: null,
      plannedTargetLoadKgSnapshot: 0,
      plannedTargetLoadTextSnapshot: null,
      plannedDurationMinutesSnapshot: null,
      plannedDistanceKmSnapshot: null,
      plannedIntensityTextSnapshot: null,
      plannedRestSecondsSnapshot: 0,
      plannedNotesSnapshot: null,
    });
    load(data);
    const activity = fixture.nativeElement.querySelector('article');
    expect(activity.textContent).toContain('0 kg');
    expect(activity.textContent).toContain('0 s');
    expect(activity.textContent).not.toContain('Repetições');
    expect(activity.textContent).not.toMatch(/null|undefined/);
  });

  it('preserves activity order and existing execution without creating execution controls', () => {
    const data = structuredClone(sessionDetail);
    data.activities[0].actualDurationMinutes = 7;
    data.activities[0].actualDistanceKm = 1.2;
    data.activities[0].sets = [
      {
        id: 300,
        setNumber: 1,
        actualLoadKg: 20,
        actualLoadMode: 'PER_SIDE',
        actualReps: 9,
        notes: 'Registro real',
        createdAt: data.createdAt,
        updatedAt: null,
      },
    ];
    data.activities.push({
      ...structuredClone(data.activities[0]),
      id: 201,
      orderIndexSnapshot: 2,
      exerciseNameSnapshot: 'Segundo exercício',
    });
    load(data);
    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('article h3') as NodeListOf<HTMLElement>,
    ).map((element) => element.textContent!.trim());
    expect(titles).toEqual(['Exercício preservado', 'Segundo exercício']);
    expect(component.session()?.activities).toEqual(data.activities);
    expect(fixture.nativeElement.querySelectorAll('input, textarea, select')).toHaveLength(0);
    component.closeSession();
    http.expectOne(`${url}/100/close`).flush({ id: 100, status: 'CLOSED', closeReason: 'MANUAL' });
    expect(component.session()?.activities).toEqual(data.activities);
  });

  it.each([400, 403, 500])('retries detail load error %s without mutations', (status) => {
    create();
    http
      .expectOne(`${url}/100`)
      .flush({ message: 'Falha ao consultar' }, { status, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Falha ao consultar',
    );
    button('Tentar novamente').click();
    http.expectOne(`${url}/100`).flush(sessionDetail);
    expect(component.canClose()).toBe(true);
  });

  it('leaves unauthorized handling to the existing interceptor without recovery mutations', () => {
    load();
    component.closeSession();
    http.expectOne(`${url}/100/close`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
    http.expectNone(`${url}/100`);
  });

  it('recovers the open session and replaces the recovery URL with its stable ID', () => {
    params.next(convertToParamMap({}));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    create();
    http.expectOne(`${url}/in-progress`).flush(sessionDetail);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/workout-sessions', 100], {
      replaceUrl: true,
    });
  });

  it('renders expected absence with access to planning and a fresh lookup', () => {
    params.next(convertToParamMap({}));
    create();
    http.expectOne(`${url}/in-progress`).flush(
      { message: 'Sessão de treino em andamento não encontrada.' },
      { status: 404, statusText: 'Not Found' },
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma sessão de treino em andamento.');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    button('Consultar novamente').click();
    http.expectOne(`${url}/in-progress`).flush(sessionDetail);
    component.backToPlanning();
    expect(navigate).toHaveBeenCalledWith(['/workout-planning']);
  });

  it.each([400, 403, 404, 409, 500])('keeps unexpected recovery error %s recoverable', (status) => {
    params.next(convertToParamMap({}));
    create();
    http
      .expectOne(`${url}/in-progress`)
      .flush({ message: 'Falha real' }, { status, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Falha real',
    );
    expect(component.empty()).toBe(false);
    button('Tentar novamente').click();
    http.expectOne(`${url}/in-progress`).flush(null);
  });

  it('shows not found for missing detail and rejects invalid route IDs without HTTP', () => {
    create();
    http.expectOne(`${url}/100`).flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sessão de treino não encontrada');
    for (const id of ['0', '-1', 'abc', '1.5', '9007199254740992']) {
      params.next(convertToParamMap({ id }));
      expect(component.notFound()).toBe(true);
    }
    http.expectNone(() => true);
  });

  it.each([false, undefined])(
    'does not close after confirmation is dismissed with %s',
    (confirmed) => {
      load();
      dialog.open.mockReturnValue(of(confirmed));
      button('Encerrar sessão').click();
      expect(dialog.open).toHaveBeenCalledWith(
        expect.objectContaining({ secondaryAction: 'Voltar' }),
      );
      http.expectNone(`${url}/100/close`);
      expect(component.canClose()).toBe(true);
    },
  );

  it.each(['MANUAL', 'AUTO_EXPIRED'] as const)(
    'confirms once and applies real %s lifecycle without losing snapshots',
    (closeReason) => {
      load();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      const confirmed = new Subject<boolean>();
      dialog.open.mockReturnValue(confirmed);
      button('Encerrar sessão').click();
      fixture.detectChanges();
      expect(component.closeState()).toBe('confirming');
      component.closeSession();
      component.loadSession();
      component.backToPlanning();
      component.openSourceCycle();
      expect(dialog.open).toHaveBeenCalledTimes(1);
      expect(navigate).not.toHaveBeenCalled();
      http.expectNone(() => true);
      confirmed.next(true);
      confirmed.next(true);
      const request = http.expectOne(`${url}/100/close`);
      expect(request.request.body).toBeNull();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Encerrando sessão');
      expect(fixture.nativeElement.querySelector('section').getAttribute('aria-busy')).toBe('true');
      component.closeSession();
      component.loadSession();
      http.expectNone(() => true);
      const lifecycle = {
        id: 100,
        status: 'CLOSED',
        closeReason,
        performedOn: sessionDetail.performedOn,
        startedAt: sessionDetail.startedAt,
        finishedAt: '2026-10-28T06:00:00Z',
        updatedAt: '2026-10-28T06:05:00Z',
      };
      request.flush(lifecycle);
      fixture.detectChanges();
      expect(component.session()).toEqual({ ...sessionDetail, ...lifecycle });
      expect(button('Encerrar sessão')).toBeUndefined();
      expect(fixture.nativeElement.textContent).toContain('Encerrada');
      expect(closeReason === 'MANUAL' ? toast.success : toast.info).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['MANUAL', 'AUTO_EXPIRED'] as const)(
    'opens an already closed %s session without allowing closure',
    (closeReason) => {
      load({ ...sessionDetail, status: 'CLOSED', closeReason, finishedAt: '2026-10-28T06:00:00Z' });
      component.closeSession();
      expect(button('Encerrar sessão')).toBeUndefined();
      expect(dialog.open).not.toHaveBeenCalled();
      http.expectNone(() => true);
    },
  );

  it.each([400, 403, 404, 409, 500, 0])(
    'reconciles close failure %s before another mutation',
    (status) => {
      load();
      component.closeSession();
      const request = http.expectOne(`${url}/100/close`);
      if (status === 0) request.error(new ProgressEvent('error'));
      else request.flush({ message: 'Sessão já encerrada.' }, { status, statusText: 'Error' });
      expect(component.canClose()).toBe(false);
      component.closeSession();
      http.expectNone(`${url}/100/close`);
      http.expectOne(`${url}/100`).flush({
        ...sessionDetail,
        status: 'CLOSED',
        closeReason: 'AUTO_EXPIRED',
        finishedAt: '2026-10-28T06:00:00Z',
      });
      expect(component.session()?.closeReason).toBe('AUTO_EXPIRED');
      expect(toast.success).not.toHaveBeenCalled();
    },
  );

  it('retains stale data and blocks closure if reconciliation fails, then retries only GET', () => {
    load();
    component.closeSession();
    http.expectOne(`${url}/100/close`).error(new ProgressEvent('error'));
    http.expectOne(`${url}/100`).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(component.session()).toEqual(sessionDetail);
    expect(component.canClose()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('podem estar desatualizados');
    button('Tentar novamente').click();
    http.expectOne(`${url}/100`).flush(sessionDetail);
    expect(component.canClose()).toBe(true);
  });

  it('refreshes on return to visibility, without deriving expiration from the browser clock', () => {
    load();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    http.expectNone(() => true);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));
    http
      .expectOne(`${url}/100`)
      .flush({ ...sessionDetail, status: 'CLOSED', closeReason: 'AUTO_EXPIRED' });
    expect(component.session()?.status).toBe('CLOSED');
    fixture.destroy();
    document.dispatchEvent(new Event('visibilitychange'));
    http.expectNone(() => true);
  });

  it('cancels old reads and old closures when the route changes to another session', () => {
    create();
    const first = http.expectOne(`${url}/100`);
    params.next(convertToParamMap({ id: '101' }));
    expect(first.cancelled).toBe(true);
    http.expectOne(`${url}/101`).flush({ ...sessionDetail, id: 101 });
    component.closeSession();
    const close = http.expectOne(`${url}/101/close`);
    params.next(convertToParamMap({ id: '102' }));
    expect(close.cancelled).toBe(true);
    expect(component.session()).toBeNull();
    http.expectOne(`${url}/102`).flush({ ...sessionDetail, id: 102 });
    expect(component.session()?.id).toBe(102);
    expect(component.canClose()).toBe(true);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('ignores a confirmation from a previous route', () => {
    load();
    const confirmed = new Subject<boolean>();
    dialog.open.mockReturnValue(confirmed);
    component.closeSession();
    params.next(convertToParamMap({ id: '101' }));
    http.expectOne(`${url}/101`).flush({ ...sessionDetail, id: 101 });
    confirmed.next(true);
    http.expectNone((request) => request.method === 'PATCH');
  });
});
