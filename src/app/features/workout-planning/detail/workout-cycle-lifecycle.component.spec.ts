import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { cycleDetail } from '../workout-planning.testing';
import { GetWorkoutCycleDetailResponse, WorkoutStatus } from '../workout-planning.models';
import { WorkoutCycleDetailComponent } from './workout-cycle-detail.component';

describe('Workout cycle lifecycle with the HTTP service', () => {
  let fixture: ComponentFixture<WorkoutCycleDetailComponent>;
  let component: WorkoutCycleDetailComponent;
  let http: HttpTestingController;
  const url = '/api/users/me/workout-cycles/9';
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
  });

  afterEach(() => http.verify());

  async function create(status: WorkoutStatus = 'NOT_STARTED', data = cycleDetail) {
    fixture = TestBed.createComponent(WorkoutCycleDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(url).flush({ ...data, workoutStatus: status });
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function button(label: string): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector(`[aria-label="${label}"]`);
  }

  function click(label: string) {
    button(label)!.click();
    fixture.detectChanges();
  }

  it.each([
    ['NOT_STARTED', true, false, true],
    ['IN_PROGRESS', false, true, true],
    ['COMPLETED', false, false, false],
    ['CANCELLED', false, false, false],
  ] as const)(
    'shows only valid lifecycle actions in %s',
    async (status, start, complete, cancel) => {
      await create(status);
      for (const [label, visible] of [
        ['Iniciar ciclo de treino', start],
        ['Concluir ciclo de treino', complete],
        ['Cancelar ciclo de treino', cancel],
      ] as const) {
        expect(!!button(label)).toBe(visible);
        if (visible) {
          expect(button(label)!.getAttribute('type')).toBe('button');
          expect(button(label)!.classList.contains('mat-mdc-tooltip-trigger')).toBe(true);
        }
      }
    },
  );

  it('starts once, locks conflicting actions, shows loading and applies returned status and date', async () => {
    await create('NOT_STARTED', { ...cycleDetail, startDate: null, endDate: null });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    click('Iniciar ciclo de treino');
    const request = http.expectOne(`${url}/start`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toBeNull();
    expect(dialog.open).not.toHaveBeenCalled();
    expect(component.lifecycleState()).toBe('saving');
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Atualizando o status',
    );
    expect(fixture.nativeElement.querySelector('section').getAttribute('aria-busy')).toBe('true');
    for (const element of fixture.nativeElement.querySelectorAll('button'))
      expect(element.disabled).toBe(true);
    component.startCycle();
    component.completeCycle();
    component.cancelCycle();
    component.startEdit();
    component.openDayForm('create');
    component.openActivitySelector(cycleDetail.days[0]);
    component.startSession(cycleDetail.days[0]);
    component.deleteDay(cycleDetail.days[0]);
    component.deleteActivity(cycleDetail.days[0], cycleDetail.days[0].activities[0]);
    component.saveDay();
    component.saveActivity();
    component.backToCycles();
    component.loadCycle();
    http.expectNone(() => true);
    expect(component.editing()).toBe(false);
    expect(component.dayMode()).toBeNull();
    expect(component.activityMode()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    request.flush({
      id: 9,
      trainingGoalId: 22,
      workoutStatus: 'IN_PROGRESS',
      startDate: '2026-10-17',
    });
    fixture.detectChanges();
    expect(component.lifecycleState()).toBeNull();
    expect(component.cycle()).toEqual({
      ...cycleDetail,
      workoutStatus: 'IN_PROGRESS',
      startDate: '2026-10-17',
      endDate: null,
    });
    expect(fixture.nativeElement.textContent).toContain('17/10/2026');
    expect(button('Iniciar ciclo de treino')).toBeNull();
    expect(button('Concluir ciclo de treino')!.disabled).toBe(false);
    expect(button('Editar ciclo de treino')!.disabled).toBe(false);
    expect(button('Adicionar dia de treino')!.disabled).toBe(false);
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('Ciclo de treino iniciado com sucesso.');
    component.startEdit();
    http
      .expectOne('/api/training-goals')
      .flush([{ id: 22, code: 'STRENGTH', name: cycleDetail.trainingGoal.name }]);
    expect(component.editing()).toBe(true);
    http.expectNone(url);
  });

  it.each([
    ['IN_PROGRESS', 'complete', 'Concluir ciclo de treino', 'COMPLETED', 'concluído'],
    ['NOT_STARTED', 'cancel', 'Cancelar ciclo de treino', 'CANCELLED', 'cancelado'],
    ['IN_PROGRESS', 'cancel', 'Cancelar ciclo de treino', 'CANCELLED', 'cancelado'],
  ] as const)(
    'confirms %s -> %s, blocks concurrent actions and locks the terminal state',
    async (status, action, label, result, feedback) => {
      await create(status);
      const before = component.cycle()!;
      const confirmation = new Subject<boolean>();
      dialog.open.mockReturnValue(confirmation);
      click(label);
      expect(component.lifecycleState()).toBe('confirming');
      expect(dialog.open).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          title: label,
          message: expect.stringContaining(
            'não será possível editar o ciclo, seus dias ou atividades',
          ),
          secondaryAction: 'Voltar',
        }),
      );
      component.startCycle();
      component.completeCycle();
      component.cancelCycle();
      component.startEdit();
      component.openDayForm('create');
      component.openActivitySelector(before.days[0]);
      expect(component.editing()).toBe(false);
      expect(component.dayMode()).toBeNull();
      expect(component.activityMode()).toBeNull();
      http.expectNone(() => true);
      confirmation.next(true);
      confirmation.next(true);
      confirmation.complete();
      fixture.detectChanges();
      const request = http.expectOne(`${url}/${action}`);
      expect(component.lifecycleState()).toBe('saving');
      component.completeCycle();
      component.cancelCycle();
      http.expectNone(() => true);
      request.flush({
        id: 9,
        trainingGoalId: 22,
        workoutStatus: result,
        ...(action === 'complete' ? { startDate: '2026-10-03', endDate: '2026-10-17' } : {}),
      });
      fixture.detectChanges();
      expect(component.cycle()).toEqual({
        ...before,
        workoutStatus: result,
        ...(action === 'complete' ? { startDate: '2026-10-03', endDate: '2026-10-17' } : {}),
      });
      expect(component.canEdit()).toBe(false);
      expect(component.lifecycleBusy()).toBe(false);
      expect(fixture.nativeElement.textContent).toContain(
        result === 'COMPLETED' ? 'Concluído' : 'Cancelado',
      );
      if (action === 'complete') {
        expect(fixture.nativeElement.textContent).toContain('03/10/2026');
        expect(fixture.nativeElement.textContent).toContain('17/10/2026');
      }
      for (const label of ['Iniciar', 'Concluir', 'Cancelar', 'Editar'])
        expect(button(`${label} ciclo de treino`)).toBeNull();
      expect(button('Adicionar dia de treino')).toBeNull();
      expect(fixture.nativeElement.querySelector('.ic-workout-detail__day-actions')).toBeNull();
      expect(toast.success).toHaveBeenCalledExactlyOnceWith(
        `Ciclo de treino ${feedback} com sucesso.`,
      );
      component.startCycle();
      component.completeCycle();
      component.cancelCycle();
      component.startEdit();
      component.save();
      component.openDayForm('create');
      component.openDayForm('edit', before.days[0]);
      component.openDayForm('reorder', before.days[0]);
      component.saveDay();
      component.deleteDay(before.days[0]);
      component.openActivitySelector(before.days[0]);
      component.openActivityForm('edit', before.days[0], before.days[0].activities[0]);
      component.openActivityForm('reorder', before.days[0], before.days[0].activities[0]);
      component.saveActivity();
      component.deleteActivity(before.days[0], before.days[0].activities[0]);
      http.expectNone(() => true);
      expect(dialog.open).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['COMPLETED', 'CANCELLED'] as const)(
    'does not call lifecycle endpoints when opened in %s',
    async (status) => {
      await create(status);
      component.startCycle();
      component.completeCycle();
      component.cancelCycle();
      http.expectNone(() => true);
      expect(dialog.open).not.toHaveBeenCalled();
    },
  );

  it.each(['complete', 'cancel'] as const)(
    'does not %s when confirmation is dismissed',
    async (action) => {
      await create('IN_PROGRESS');
      dialog.open.mockReturnValue(of(undefined));
      if (action === 'complete') component.completeCycle();
      else component.cancelCycle();
      expect(component.lifecycleBusy()).toBe(false);
      expect(component.cycle()?.workoutStatus).toBe('IN_PROGRESS');
      http.expectNone(() => true);
      expect(toast.success).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['NOT_STARTED', 'complete'],
    ['IN_PROGRESS', 'start'],
  ] as const)('rejects %s -> %s without calling the API', async (status, action) => {
    await create(status);
    if (action === 'start') component.startCycle();
    else component.completeCycle();
    http.expectNone(() => true);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it.each([
    ['start', 'O ciclo de treino deve possuir pelo menos um dia de treino.', 422, []],
    [
      'start',
      'Cada dia de treino deve possuir pelo menos uma atividade.',
      422,
      [{ ...cycleDetail.days[0], activities: [] }],
    ],
    ['start', 'Objetivo de treino não encontrado.', 404, cycleDetail.days],
    ['start', 'Objetivo de treino inativo.', 400, cycleDetail.days],
    ['start', 'Usuário inativo.', 403, cycleDetail.days],
    ['complete', 'Somente um ciclo em andamento pode ser concluído.', 400, cycleDetail.days],
    ['cancel', 'Ciclo de treino não encontrado.', 404, cycleDetail.days],
  ] satisfies [
    'start' | 'complete' | 'cancel',
    string,
    number,
    GetWorkoutCycleDetailResponse['days'],
  ][])(
    'preserves the API error for %s: %s and allows retry',
    async (action, message, status, days) => {
      await create(action === 'start' ? 'NOT_STARTED' : 'IN_PROGRESS', {
        ...cycleDetail,
        days: [...days],
      });
      const before = component.cycle();
      const invoke = () => {
        if (action === 'start') component.startCycle();
        else if (action === 'complete') component.completeCycle();
        else component.cancelCycle();
      };
      invoke();
      http.expectOne(`${url}/${action}`).flush({ message }, { status, statusText: 'API error' });
      fixture.detectChanges();
      expect(dialog.open).toHaveBeenLastCalledWith(
        expect.objectContaining({ message, primaryAction: 'Ok' }),
      );
      expect(component.cycle()).toEqual(before);
      expect(component.canEdit()).toBe(true);
      expect(component.lifecycleBusy()).toBe(false);
      expect(toast.success).not.toHaveBeenCalled();
      http.expectNone(url);
      invoke();
      http.expectOne(`${url}/${action}`).flush({ message }, { status, statusText: 'API error' });
    },
  );

  it('uses the existing fallback for an API error without a message', async () => {
    await create();
    component.startCycle();
    http.expectOne(`${url}/start`).flush({}, { status: 500, statusText: 'Error' });
    expect(dialog.open).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Tente novamente mais tarde.' }),
    );
    expect(component.lifecycleBusy()).toBe(false);
  });

  it.each([
    'editing',
    'saving',
    'dayMode',
    'daySaving',
    'daysLoading',
    'confirmingDelete',
    'activityMode',
    'activitySaving',
    'activitiesLoading',
    'confirmingActivityDelete',
    'loading',
    'error',
  ] as const)('blocks lifecycle while %s is active', async (state) => {
    await create();
    if (state === 'dayMode') component.dayMode.set('create');
    else if (state === 'activityMode') component.activityMode.set('select');
    else if (state === 'error') component.error.set('Falha ao atualizar composição.');
    else component[state].set(true);
    component.startCycle();
    component.completeCycle();
    component.cancelCycle();
    expect(dialog.open).not.toHaveBeenCalled();
    http.expectNone(() => true);
  });
});
