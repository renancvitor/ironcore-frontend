import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { GetWorkoutSessionDetailResponse } from '../workout-sessions.models';
import { sessionDetail, sessionSet } from '../workout-sessions.testing';
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
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
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

  it('loads independently on refresh and renders historical prescriptions with empty execution controls', () => {
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
    expect(component.editor.activities()[0].rows).toHaveLength(3);
    for (const row of component.editor.activities()[0].rows) {
      expect(row.form.getRawValue()).toEqual({ actualLoadKg: null, actualReps: null, notes: '' });
      expect(row.persisted).toBeNull();
    }
    expect(component.editor.activities()[0].form.getRawValue()).toEqual({
      actualDurationMinutes: null, actualDistanceKm: null, notes: '',
    });
    http.expectNone((request) => ['POST', 'PATCH', 'DELETE'].includes(request.method));
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
    expect(activity.querySelector('.ic-activity__reference').textContent).not.toContain('Repetições');
    expect(activity.textContent).not.toMatch(/null|undefined/);
  });

  it('preserves activity order and existing execution in their historical rows', () => {
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
        normalizedLoadKg: 40,
        notes: 'Registro real',
        createdAt: data.createdAt,
        updatedAt: null,
      },
    ];
    data.activities[0].actualLoadMode = 'PER_SIDE';
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
    expect(component.editor.activities()[0].rows[0].persisted?.id).toBe(300);
    expect(component.editor.activities()[0].rows[0].form.getRawValue()).toEqual({
      actualLoadKg: 20, actualReps: 9, notes: 'Registro real',
    });
    expect(component.editor.activities()[0].form.getRawValue()).toEqual({
      actualDurationMinutes: 7, actualDistanceKm: 1.2, notes: '',
    });
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

  it('cancels old reads but refuses context changes while closure is in progress', () => {
    create();
    const first = http.expectOne(`${url}/100`);
    params.next(convertToParamMap({ id: '101' }));
    expect(first.cancelled).toBe(true);
    http.expectOne(`${url}/101`).flush({ ...sessionDetail, id: 101 });
    component.closeSession();
    const close = http.expectOne(`${url}/101/close`);
    params.next(convertToParamMap({ id: '102' }));
    expect(close.cancelled).toBe(false);
    expect(component.session()?.id).toBe(101);
    http.expectNone(`${url}/102`);
    close.flush({ id: 101, status: 'CLOSED', closeReason: 'MANUAL' });
    expect(component.session()?.id).toBe(101);
    expect(component.canClose()).toBe(false);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('keeps the previous route while its closure confirmation is open', () => {
    load();
    const confirmed = new Subject<boolean>();
    dialog.open.mockReturnValue(confirmed);
    component.closeSession();
    params.next(convertToParamMap({ id: '101' }));
    http.expectNone(`${url}/101`);
    expect(component.session()?.id).toBe(100);
    confirmed.next(false);
    http.expectNone((request) => request.method === 'PATCH');
  });

  it.each([false, undefined, 'error'])(
    'preserves the accepted context and forms when parameter confirmation returns %s', (result) => {
      load();
      const form = component.editor.activities()[0].rows[0].form;
      form.controls.actualReps.setValue(7);
      dialog.open.mockReturnValue(result === 'error' ? throwError(() => new Error('Falha')) : of(result));
      vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      params.next(convertToParamMap({ id: '101' }));
      expect(component.session()?.id).toBe(100);
      expect(component.editor.activities()[0].rows[0].form).toBe(form);
      expect(form.controls.actualReps.value).toBe(7);
      expect(component.navigationConfirming()).toBe(false);
      http.expectNone(`${url}/101`);
    },
  );

  it('changes a reused parameter context only after explicit discard confirmation', () => {
    load();
    component.editor.notes.setValue('Não perder silenciosamente');
    const confirmed = new Subject<boolean>();
    dialog.open.mockReturnValue(confirmed);
    params.next(convertToParamMap({ id: '101' }));
    expect(component.session()?.id).toBe(100);
    http.expectNone(`${url}/101`);
    confirmed.next(true);
    http.expectOne(`${url}/101`).flush({ ...sessionDetail, id: 101 });
    expect(component.session()?.id).toBe(101);
    expect(component.editor.notes.value).toBe('');
  });

  it('does not reset a writing editor when paramMap changes without a navigation approval', () => {
    load();
    const activity = component.editor.activities()[0];
    const form = activity.rows[0].form;
    form.controls.actualReps.setValue(8);
    component.editor.saveSet(activity, activity.rows[0]);
    const writing = http.expectOne(`${url}/100/activities/200/sets`);
    params.next(convertToParamMap({ id: '101' }));
    expect(writing.cancelled).toBe(false);
    expect(component.session()?.id).toBe(100);
    expect(component.editor.activities()[0].rows[0].form).toBe(form);
    http.expectNone(`${url}/101`);
    writing.flush(sessionSet());
    http.expectOne(`${url}/100`).flush({ ...sessionDetail, activities: [
      { ...sessionDetail.activities[0], sets: [sessionSet()] },
    ] });
    expect(component.session()?.id).toBe(100);
    expect(component.editor.activities()[0].rows[0].persisted?.id).toBe(300);
  });

  it('preserves the same edited form on visibility refresh and exposes real expiration', () => {
    load();
    const form = component.editor.activities()[0].rows[0].form;
    form.controls.notes.setValue('Rascunho');
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    http.expectOne(`${url}/100`).flush({ ...sessionDetail, status: 'CLOSED', closeReason: 'AUTO_EXPIRED' });
    fixture.detectChanges();
    expect(component.editor.activities()[0].rows[0].form).toBe(form);
    expect(form.controls.notes.value).toBe('Rascunho');
    expect(component.editor.canWrite()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('rascunhos não enviados foram preservados');
  });

  it('requires explicit closure without saving and retains drafts until success', () => {
    load();
    component.editor.notes.setValue('Relato ainda não salvo');
    component.closeSession();
    expect(dialog.open).toHaveBeenCalledWith(expect.objectContaining({
      primaryAction: 'Encerrar sem salvar alterações', message: expect.stringContaining('alterações não salvas'),
    }));
    const close = http.expectOne(`${url}/100/close`);
    expect(component.editor.notes.value).toBe('Relato ainda não salvo');
    http.expectNone(`${url}/100/notes`);
    close.flush({ id: 100, status: 'CLOSED', closeReason: 'MANUAL' });
    expect(component.editor.hasPending()).toBe(false);
    expect(component.editor.notes.value).toBe('');
  });

  it('saves the general report through the real form submit without saving other drafts', () => {
    load();
    component.editor.activities()[0].rows[0].form.controls.actualReps.setValue(7);
    const textarea = fixture.nativeElement.querySelector('#session-execution-notes') as HTMLTextAreaElement;
    textarea.value = 'Relato geral informado';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form.ic-session__notes').dispatchEvent(new Event('submit', { cancelable: true }));
    const request = http.expectOne(`${url}/100/notes`);
    expect(request.request.body).toEqual({ notes: 'Relato geral informado' });
    const saved = { ...sessionDetail, notes: 'Relato geral informado' };
    request.flush(saved);
    http.expectOne(`${url}/100`).flush(saved);
    expect(component.editor.activities()[0].rows[0].form.controls.actualReps.value).toBe(7);
    http.expectNone((mutation) => mutation.method === 'POST');
  });

  it('keeps dirty values when closure confirmation is cancelled', () => {
    load();
    component.editor.notes.setValue('Continuar preenchendo');
    dialog.open.mockReturnValue(of(false));
    component.closeSession();
    expect(component.editor.notes.value).toBe('Continuar preenchendo');
    expect(component.editor.hasPending()).toBe(true);
    expect(component.canClose()).toBe(true);
    http.expectNone(`${url}/100/close`);
  });

  it('keeps drafts after a failed closure and reconciliation', () => {
    load();
    component.editor.notes.setValue('Preservar após falha');
    component.closeSession();
    http.expectOne(`${url}/100/close`).error(new ProgressEvent('error'));
    http.expectOne(`${url}/100`).flush({ ...sessionDetail, status: 'CLOSED', closeReason: 'AUTO_EXPIRED' });
    expect(component.editor.notes.value).toBe('Preservar após falha');
    expect(component.editor.hasPending()).toBe(true);
    expect(component.canClose()).toBe(false);
  });

  it('prevents closure while a set is saving, being reconciled, or still uncertain', () => {
    load();
    const activity = component.editor.activities()[0];
    activity.rows[0].form.controls.actualReps.setValue(8);
    component.editor.saveSet(activity, activity.rows[0]);
    component.closeSession();
    expect(dialog.open).not.toHaveBeenCalled();
    http.expectOne(`${url}/100/activities/200/sets`).error(new ProgressEvent('error'));
    expect(component.canClose()).toBe(false);
    http.expectOne(`${url}/100`).flush(sessionDetail);
    expect(component.canClose()).toBe(false);
    component.closeSession();
    http.expectNone(`${url}/100/close`);
  });

  it('warns before unload only with drafts or pending operations and removes its listener', () => {
    load();
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    component.editor.notes.setValue('Pendente');
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
    fixture.destroy();
    const destroyed = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(destroyed);
    expect(destroyed.defaultPrevented).toBe(false);
  });
});
