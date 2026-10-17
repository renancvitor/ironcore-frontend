import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { WorkoutPlanningService } from '../workout-planning.service';
import { CreateWorkoutCycleResponse, TrainingGoalResponse } from '../workout-planning.models';
import { cycleDetail } from '../workout-planning.testing';
import { WorkoutCycleFormComponent } from './workout-cycle-form.component';

describe('WorkoutCycleFormComponent', () => {
  let fixture: ComponentFixture<WorkoutCycleFormComponent>;
  const goals = [{ id: 22, code: 'SERVER_GOAL', name: 'Objetivo do backend' }];
  const response: CreateWorkoutCycleResponse = {
    id: 15,
    personId: 1,
    name: 'Nome normalizado',
    trainingGoalId: 22,
    desiredDurationMonths: null,
    notes: null,
    workoutStatus: 'NOT_STARTED',
    workoutOrigin: 'MANUAL',
    createdAt: '2026-10-17T10:00:00',
  };
  const service = {
    getTrainingGoals: vi.fn(),
    createWorkoutCycle: vi.fn(),
    updateWorkoutCycle: vi.fn(),
  };
  const dialog = { open: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    service.getTrainingGoals.mockReturnValue(of(goals));
    service.createWorkoutCycle.mockReturnValue(of(response));
    service.updateWorkoutCycle.mockReturnValue(
      of({ ...response, id: 9, startDate: null, updatedAt: '' }),
    );
    dialog.open.mockReturnValue(of(true));
    await TestBed.configureTestingModule({
      imports: [WorkoutCycleFormComponent],
      providers: [
        { provide: WorkoutPlanningService, useValue: service },
        { provide: DialogService, useValue: dialog },
      ],
    }).compileComponents();
  });

  async function create(edit = false) {
    fixture = TestBed.createComponent(WorkoutCycleFormComponent);
    if (edit) fixture.componentRef.setInput('cycle', cycleDetail);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('loads real goals and blocks submission while loading', async () => {
    const request = new Subject<TrainingGoalResponse[]>();
    service.getTrainingGoals.mockReturnValue(request);
    const component = await create();
    component.form.patchValue({ name: 'Novo', trainingGoalId: 22 });
    component.submit();
    expect(service.createWorkoutCycle).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Carregando objetivos');
    expect(component.form.controls.trainingGoalId.disabled).toBe(true);
    request.next(goals);
    request.complete();
    fixture.detectChanges();
    expect(component.form.valid).toBe(true);
    expect(component.form.controls.trainingGoalId.enabled).toBe(true);
    expect(service.getTrainingGoals).toHaveBeenCalledTimes(1);
  });

  it('shows required validation and rejects blank names and invalid IDs', async () => {
    const component = await create();
    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Informe o nome.');
    expect(component.form.controls.trainingGoalId.touched).toBe(true);
    component.form.patchValue({ name: '  ', trainingGoalId: -1 });
    component.submit();
    expect(component.form.invalid).toBe(true);
    component.form.patchValue({ name: 'Novo', trainingGoalId: 99 });
    component.submit();
    expect(service.createWorkoutCycle).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5])('rejects invalid duration %s', async (duration) => {
    const component = await create();
    component.form.patchValue({
      name: 'Novo',
      trainingGoalId: 22,
      desiredDurationMonths: duration,
    });
    component.submit();
    fixture.detectChanges();
    expect(component.form.controls.desiredDurationMonths.invalid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('número inteiro positivo');
    expect(service.createWorkoutCycle).not.toHaveBeenCalled();
  });

  it('creates once, disables fields while saving and emits the server response', async () => {
    const request = new Subject<CreateWorkoutCycleResponse>();
    service.createWorkoutCycle.mockReturnValue(request);
    const component = await create();
    const saved = vi.fn();
    component.saved.subscribe(saved);
    const busy = vi.fn();
    component.busy.subscribe(busy);
    component.form.patchValue({ name: ' Novo ', trainingGoalId: 22 });
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    component.submit();
    fixture.detectChanges();
    expect(service.createWorkoutCycle).toHaveBeenCalledExactlyOnceWith({
      name: 'Novo',
      trainingGoalId: 22,
      desiredDurationMonths: null,
      notes: null,
    });
    expect(component.form.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Salvando...');
    request.next(response);
    request.complete();
    expect(saved).toHaveBeenCalledWith({ response, trainingGoal: { id: 22, name: goals[0].name } });
    expect(component.saving()).toBe(false);
    expect(component.form.enabled).toBe(true);
    expect(busy.mock.calls).toEqual([[true], [false]]);
  });

  it('populates existing fields and supports clearing optional values on update', async () => {
    const component = await create(true);
    expect(component.form.getRawValue()).toEqual({
      name: cycleDetail.name,
      trainingGoalId: 22,
      desiredDurationMonths: 3,
      notes: cycleDetail.notes,
    });
    component.form.patchValue({ desiredDurationMonths: null, notes: '' });
    component.submit();
    expect(service.updateWorkoutCycle).toHaveBeenCalledWith(9, {
      name: cycleDetail.name,
      trainingGoalId: 22,
      desiredDurationMonths: null,
      notes: null,
    });
    expect(service.createWorkoutCycle).not.toHaveBeenCalled();
  });

  it.each(['create', 'update'])('keeps input and shows API errors on %s', async (mode) => {
    const component = await create(mode === 'update');
    const operation = mode === 'create' ? service.createWorkoutCycle : service.updateWorkoutCycle;
    operation.mockReturnValue(throwError(() => ({ error: { message: 'Regra do backend.' } })));
    const saved = vi.fn();
    component.saved.subscribe(saved);
    component.form.patchValue({
      name: 'Novo',
      trainingGoalId: 22,
      desiredDurationMonths: 4,
      notes: 'Nota',
    });
    component.submit();
    expect(dialog.open).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Regra do backend.' }),
    );
    expect(component.form.controls.notes.value).toBe('Nota');
    expect(component.form.enabled).toBe(true);
    expect(component.saving()).toBe(false);
    expect(saved).not.toHaveBeenCalled();
  });

  it('recovers from goals errors and blocks saving without active goals', async () => {
    service.getTrainingGoals.mockReturnValueOnce(throwError(() => new Error('offline')));
    const component = await create();
    component.submit();
    expect(service.createWorkoutCycle).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    fixture.detectChanges();
    expect(service.getTrainingGoals).toHaveBeenCalledTimes(2);
    expect(component.goalsError()).toBe(false);
    expect(component.goals()).toEqual(goals);
  });

  it('preserves an unavailable current goal visibly and requires an active replacement', async () => {
    service.getTrainingGoals.mockReturnValue(of([]));
    const component = await create(true);
    expect(component.form.controls.trainingGoalId.value).toBe(22);
    component.submit();
    fixture.detectChanges();
    expect(service.updateWorkoutCycle).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('O objetivo atual está indisponível');
    expect(component.form.invalid).toBe(true);
  });

  it.each(['COMPLETED', 'CANCELLED'])('rejects update in %s', async (status) => {
    const component = await create(true);
    fixture.componentRef.setInput('cycle', { ...cycleDetail, workoutStatus: status });
    component.submit();
    expect(service.updateWorkoutCycle).not.toHaveBeenCalled();
  });

  it('emits cancellation without a mutation', async () => {
    const component = await create();
    const cancelled = vi.fn();
    component.cancelled.subscribe(cancelled);
    fixture.nativeElement.querySelector('footer button').click();
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(service.createWorkoutCycle).not.toHaveBeenCalled();
  });
});
