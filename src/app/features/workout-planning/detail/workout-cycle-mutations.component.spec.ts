import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, Subject, throwError } from 'rxjs';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { WorkoutPlanningService } from '../workout-planning.service';
import { WorkoutCycleFormComponent } from '../form/workout-cycle-form.component';
import { cycleDetail } from '../workout-planning.testing';
import {
  TrainingGoalResponse,
  UpdateWorkoutCycleResponse,
  WorkoutStatus,
} from '../workout-planning.models';
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
    ['NOT_STARTED', true],
    ['IN_PROGRESS', true],
    ['COMPLETED', false],
    ['CANCELLED', false],
  ] as const)('shows permitted actions in %s', async (status, edit) => {
    const component = await create(status);
    expect(!!fixture.nativeElement.querySelector('[aria-label="Editar ciclo de treino"]')).toBe(
      edit,
    );
    expect(!!fixture.nativeElement.querySelector('[aria-label="Excluir ciclo de treino"]')).toBe(
      false,
    );
    component.startEdit();
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
    expect(editor.form().controls.name.value).toBe(cycleDetail.name);
    editor.form().patchValue({
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
    editor.form().controls.name.setValue('Rascunho');
    editor.cancelled.emit();
    fixture.detectChanges();
    expect(component.cycle()?.name).toBe(cycleDetail.name);
    expect(component.editing()).toBe(false);
    expect(service.updateWorkoutCycle).not.toHaveBeenCalled();
  });

  it('blocks save while goals load and while an update is pending', async () => {
    const goalsRequest = new Subject<TrainingGoalResponse[]>();
    const updateRequest = new Subject<UpdateWorkoutCycleResponse>();
    service.getTrainingGoals.mockReturnValue(goalsRequest);
    service.updateWorkoutCycle.mockReturnValue(updateRequest);
    const component = await create();
    component.startEdit();
    component.save();
    expect(service.updateWorkoutCycle).not.toHaveBeenCalled();
    expect(component.form.controls.trainingGoalId.disabled).toBe(true);
    goalsRequest.next([{ id: 22, code: 'GOAL', name: 'Objetivo do backend' }]);
    goalsRequest.complete();
    component.form.patchValue({ desiredDurationMonths: null, notes: '' });
    component.save();
    component.save();
    component.cancelEdit();
    fixture.detectChanges();
    expect(service.updateWorkoutCycle).toHaveBeenCalledExactlyOnceWith(9, {
      name: cycleDetail.name,
      trainingGoalId: 22,
      desiredDurationMonths: null,
      notes: null,
    });
    expect(component.saving()).toBe(true);
    expect(component.editing()).toBe(true);
    expect(component.form.disabled).toBe(true);
    expect(
      fixture.nativeElement.querySelector('[aria-label="Voltar aos ciclos de treino"]').disabled,
    ).toBe(true);
    updateRequest.next({
      id: 9,
      name: cycleDetail.name,
      trainingGoalId: 22,
      startDate: null,
      workoutStatus: 'NOT_STARTED',
      workoutOrigin: 'MANUAL',
      desiredDurationMonths: null,
      notes: null,
      updatedAt: '',
    });
    updateRequest.complete();
    fixture.detectChanges();
    expect(component.saving()).toBe(false);
    expect(component.form.enabled).toBe(true);
    expect(component.cycle()?.notes).toBeNull();
    expect(component.editing()).toBe(false);
  });

  it('keeps the editing draft and shows API errors', async () => {
    service.updateWorkoutCycle.mockReturnValue(
      throwError(() => ({ error: { message: 'Regra do backend.' } })),
    );
    const component = await create();
    component.startEdit();
    component.form.patchValue({ name: 'Rascunho', notes: 'Nota' });
    component.save();
    expect(dialog.open).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Regra do backend.' }),
    );
    expect(component.form.controls.name.value).toBe('Rascunho');
    expect(component.form.enabled).toBe(true);
    expect(component.editing()).toBe(true);
    expect(component.saving()).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('retries goals errors and rejects an unavailable current goal', async () => {
    service.getTrainingGoals
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValueOnce(of([]));
    const component = await create();
    component.startEdit();
    fixture.detectChanges();
    component.save();
    expect(service.updateWorkoutCycle).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('app-workout-cycle-form [role="alert"] button').click();
    fixture.detectChanges();
    component.save();
    expect(component.goalsError()).toBe(false);
    expect(component.form.controls.trainingGoalId.value).toBe(22);
    expect(component.form.invalid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('O objetivo atual está indisponível');
    expect(service.updateWorkoutCycle).not.toHaveBeenCalled();
  });
});
