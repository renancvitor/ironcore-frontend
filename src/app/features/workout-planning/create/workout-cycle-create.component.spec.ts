import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { WorkoutPlanningService } from '../workout-planning.service';
import { CreateWorkoutCycleResponse, TrainingGoalResponse } from '../workout-planning.models';
import { WorkoutCycleCreateComponent } from './workout-cycle-create.component';

describe('WorkoutCycleCreateComponent', () => {
  let fixture: ComponentFixture<WorkoutCycleCreateComponent>;
  const goals = [{ id: 22, code: 'GOAL', name: 'Objetivo do backend' }];
  const response: CreateWorkoutCycleResponse = {
    id: 15,
    personId: 1,
    name: 'Nome normalizado',
    trainingGoalId: 22,
    desiredDurationMonths: null,
    weekStartsOn: 'SUNDAY',
    notes: null,
    workoutStatus: 'NOT_STARTED',
    workoutOrigin: 'MANUAL',
    createdAt: '2026-10-17T10:00:00',
  };
  const service = { getTrainingGoals: vi.fn(), createWorkoutCycle: vi.fn() };
  const dialog = { open: vi.fn() };
  const toast = { success: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    service.getTrainingGoals.mockReturnValue(of(goals));
    service.createWorkoutCycle.mockReturnValue(of(response));
    dialog.open.mockReturnValue(of(true));
    await TestBed.configureTestingModule({
      imports: [WorkoutCycleCreateComponent],
      providers: [
        provideRouter([]),
        { provide: WorkoutPlanningService, useValue: service },
        { provide: DialogService, useValue: dialog },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
  });

  async function create() {
    fixture = TestBed.createComponent(WorkoutCycleCreateComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('loads goals and blocks submission while loading', async () => {
    const request = new Subject<TrainingGoalResponse[]>();
    service.getTrainingGoals.mockReturnValue(request);
    const component = await create();
    component.form.patchValue({ name: 'Novo', trainingGoalId: 22 });
    component.createCycle();
    expect(service.createWorkoutCycle).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Carregando objetivos');
    expect(component.form.controls.trainingGoalId.disabled).toBe(true);
    request.next(goals);
    request.complete();
    expect(component.form.valid).toBe(true);
    expect(component.form.controls.trainingGoalId.enabled).toBe(true);
  });

  it('shows required validation and rejects blank names and unavailable goals', async () => {
    const component = await create();
    component.createCycle();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Informe o nome.');
    expect(component.form.controls.trainingGoalId.touched).toBe(true);
    component.form.patchValue({ name: '  ', trainingGoalId: -1 });
    component.createCycle();
    expect(component.form.invalid).toBe(true);
    component.form.patchValue({ name: 'Novo', trainingGoalId: 99 });
    component.createCycle();
    expect(service.createWorkoutCycle).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5])('rejects invalid duration %s', async (desiredDurationMonths) => {
    const component = await create();
    component.form.patchValue({ name: 'Novo', trainingGoalId: 22, desiredDurationMonths });
    component.createCycle();
    fixture.detectChanges();
    expect(component.form.controls.desiredDurationMonths.invalid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('número inteiro positivo');
    expect(service.createWorkoutCycle).not.toHaveBeenCalled();
  });

  it('creates once, disables fields, navigates by returned ID and shows success', async () => {
    const request = new Subject<CreateWorkoutCycleResponse>();
    service.createWorkoutCycle.mockReturnValue(request);
    const component = await create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.form.patchValue({ name: ' Novo ', trainingGoalId: 22 });
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    component.createCycle();
    fixture.detectChanges();
    expect(service.createWorkoutCycle).toHaveBeenCalledExactlyOnceWith({
      name: 'Novo',
      trainingGoalId: 22,
      desiredDurationMonths: null,
      weekStartsOn: 'SUNDAY',
      notes: null,
    });
    expect(component.form.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Salvando...');
    component.cancel();
    expect(navigate).not.toHaveBeenCalled();
    request.next(response);
    request.complete();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/workout-planning', 15]);
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('Ciclo de treino criado com sucesso.');
    expect(component.saving()).toBe(false);
    expect(component.form.enabled).toBe(true);
  });

  it('sends the selected week start when creating a cycle', async () => {
    const component = await create();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.form.patchValue({ name: 'Novo', trainingGoalId: 22, weekStartsOn: 'SATURDAY' });
    component.createCycle();
    expect(service.createWorkoutCycle).toHaveBeenCalledExactlyOnceWith({
      name: 'Novo',
      trainingGoalId: 22,
      desiredDurationMonths: null,
      weekStartsOn: 'SATURDAY',
      notes: null,
    });
  });

  it('keeps input and shows API errors', async () => {
    service.createWorkoutCycle.mockReturnValue(
      throwError(() => ({ error: { message: 'Regra do backend.' } })),
    );
    const component = await create();
    component.form.patchValue({
      name: 'Novo',
      trainingGoalId: 22,
      desiredDurationMonths: 4,
      notes: 'Nota',
    });
    component.createCycle();
    expect(dialog.open).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Regra do backend.' }),
    );
    expect(component.form.controls.notes.value).toBe('Nota');
    expect(component.form.enabled).toBe(true);
    expect(component.saving()).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('recovers from goals error with the retry action', async () => {
    service.getTrainingGoals.mockReturnValueOnce(throwError(() => new Error('offline')));
    const component = await create();
    component.createCycle();
    expect(service.createWorkoutCycle).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    fixture.detectChanges();
    expect(service.getTrainingGoals).toHaveBeenCalledTimes(2);
    expect(component.goalsError()).toBe(false);
    expect(component.goals()).toEqual(goals);
  });

  it('blocks creation without active goals', async () => {
    service.getTrainingGoals.mockReturnValue(of([]));
    const component = await create();
    component.form.patchValue({ name: 'Novo', trainingGoalId: 22 });
    component.createCycle();
    expect(component.form.invalid).toBe(true);
    expect(service.createWorkoutCycle).not.toHaveBeenCalled();
  });

  it('cancels to the catalog without a mutation', async () => {
    await create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.nativeElement.querySelector('footer button').click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/workout-planning']);
    expect(service.createWorkoutCycle).not.toHaveBeenCalled();
  });
});
