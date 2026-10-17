import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, Subject, throwError } from 'rxjs';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { WorkoutPlanningService } from '../workout-planning.service';
import { WorkoutCycleFormComponent } from '../form/workout-cycle-form.component';
import { cycleDetail } from '../workout-planning.testing';
import { WorkoutStatus } from '../workout-planning.models';
import { WorkoutCycleDetailComponent } from './workout-cycle-detail.component';

describe('Workout cycle detail mutations', () => {
  let fixture: ComponentFixture<WorkoutCycleDetailComponent>;
  const service = {
    getWorkoutCycleDetail: vi.fn(),
    getTrainingGoals: vi.fn(),
    updateWorkoutCycle: vi.fn(),
    deleteWorkoutCycle: vi.fn(),
  };
  const dialog = { open: vi.fn() };
  const toast = { success: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    service.getTrainingGoals.mockReturnValue(
      of([
        { id: 22, code: 'GOAL', name: 'Objetivo do backend' },
        { id: 35, code: 'NEW', name: 'Novo objetivo' },
      ]),
    );
    service.deleteWorkoutCycle.mockReturnValue(of(undefined));
    dialog.open.mockReturnValue(of(true));
    await TestBed.configureTestingModule({
      imports: [WorkoutCycleDetailComponent],
      providers: [
        provideRouter([]),
        { provide: WorkoutPlanningService, useValue: service },
        { provide: DialogService, useValue: dialog },
        { provide: ToastService, useValue: toast },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '9' }) } },
        },
      ],
    }).compileComponents();
  });

  async function create(status: WorkoutStatus = 'NOT_STARTED') {
    service.getWorkoutCycleDetail.mockReturnValue(of({ ...cycleDetail, workoutStatus: status }));
    fixture = TestBed.createComponent(WorkoutCycleDetailComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it.each([
    ['NOT_STARTED', true, true],
    ['IN_PROGRESS', true, false],
    ['COMPLETED', false, false],
    ['CANCELLED', false, false],
  ] as const)('shows permitted actions in %s', async (status, edit, remove) => {
    const component = await create(status);
    expect(!!fixture.nativeElement.querySelector('[aria-label="Editar ciclo de treino"]')).toBe(
      edit,
    );
    expect(!!fixture.nativeElement.querySelector('[aria-label="Excluir ciclo de treino"]')).toBe(
      remove,
    );
    component.startEdit();
    component.deleteCycle();
    expect(component.editing()).toBe(edit);
    expect(service.deleteWorkoutCycle).not.toHaveBeenCalled();
  });

  it('opens populated editor, saves and updates the detail using the API response', async () => {
    const component = await create('IN_PROGRESS');
    service.updateWorkoutCycle.mockReturnValue(
      of({
        id: 9,
        name: 'Nome retornado',
        trainingGoalId: 35,
        startDate: '2026-10-02',
        workoutStatus: 'IN_PROGRESS',
        workoutOrigin: 'MANUAL',
        desiredDurationMonths: null,
        notes: null,
        updatedAt: '2026-10-17T10:00:00',
      }),
    );
    fixture.nativeElement.querySelector('[aria-label="Editar ciclo de treino"]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    const editor = fixture.debugElement.query(By.directive(WorkoutCycleFormComponent))
      .componentInstance as WorkoutCycleFormComponent;
    expect(editor.form.controls.name.value).toBe(cycleDetail.name);
    editor.form.patchValue({
      name: 'Nome enviado',
      trainingGoalId: 35,
      desiredDurationMonths: null,
      notes: '',
    });
    editor.submit();
    fixture.detectChanges();
    expect(service.updateWorkoutCycle).toHaveBeenCalledWith(9, {
      name: 'Nome enviado',
      trainingGoalId: 35,
      desiredDurationMonths: null,
      notes: null,
    });
    expect(component.editing()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Nome retornado');
    expect(fixture.nativeElement.textContent).toContain('Novo objetivo');
    expect(component.cycle()?.startDate).toBe('2026-10-02');
    expect(component.cycle()?.days).toEqual(cycleDetail.days);
    expect(service.getWorkoutCycleDetail).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Ciclo de treino atualizado com sucesso.');
  });

  it('cancels editing without changing the detail', async () => {
    const component = await create();
    component.startEdit();
    fixture.detectChanges();
    await fixture.whenStable();
    const editor = fixture.debugElement.query(By.directive(WorkoutCycleFormComponent))
      .componentInstance as WorkoutCycleFormComponent;
    editor.form.controls.name.setValue('Rascunho');
    editor.cancelled.emit();
    fixture.detectChanges();
    expect(component.cycle()?.name).toBe(cycleDetail.name);
    expect(component.editing()).toBe(false);
    expect(service.updateWorkoutCycle).not.toHaveBeenCalled();
  });

  it.each([false, undefined])(
    'does not delete when confirmation is cancelled: %s',
    async (result) => {
      const component = await create();
      dialog.open.mockReturnValue(of(result));
      fixture.nativeElement.querySelector('[aria-label="Excluir ciclo de treino"]').click();
      expect(dialog.open).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Excluir ciclo de treino',
          primaryAction: 'Excluir',
          secondaryAction: 'Cancelar',
          message: expect.stringContaining('não pode ser desfeita'),
        }),
      );
      expect(component.confirmingDelete()).toBe(false);
      expect(service.deleteWorkoutCycle).not.toHaveBeenCalled();
    },
  );

  it('waits for confirmation, prevents duplicate operations and navigates after real deletion', async () => {
    const confirmation = new Subject<boolean>();
    const request = new Subject<void>();
    dialog.open.mockReturnValue(confirmation);
    service.deleteWorkoutCycle.mockReturnValue(request);
    const component = await create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.deleteCycle();
    component.deleteCycle();
    component.startEdit();
    component.backToCycles();
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(service.deleteWorkoutCycle).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    confirmation.next(true);
    confirmation.complete();
    fixture.detectChanges();
    expect(service.deleteWorkoutCycle).toHaveBeenCalledExactlyOnceWith(9);
    expect(fixture.nativeElement.textContent).toContain('Excluindo ciclo');
    expect(
      fixture.nativeElement.querySelector('[aria-label="Voltar aos ciclos de treino"]').disabled,
    ).toBe(true);
    request.next();
    request.complete();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/workout-planning']);
    expect(toast.success).toHaveBeenCalledWith('Ciclo de treino excluído com sucesso.');
  });

  it('keeps the detail and shows backend errors on delete', async () => {
    service.deleteWorkoutCycle.mockReturnValue(
      throwError(() => ({
        status: 422,
        error: {
          message: 'Não é permitido excluir ciclos de treino iniciados, concluídos ou cancelados.',
        },
      })),
    );
    const component = await create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    component.deleteCycle();
    expect(dialog.open).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: 'Não é permitido excluir ciclos de treino iniciados, concluídos ou cancelados.',
      }),
    );
    expect(component.cycle()?.id).toBe(9);
    expect(component.busy()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
