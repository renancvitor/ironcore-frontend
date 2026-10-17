import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { finalize, Observable } from 'rxjs';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { WorkoutPlanningService } from '../workout-planning.service';
import {
  CreateWorkoutCycleResponse,
  GetWorkoutCycleDetailResponse,
  TrainingGoalResponse,
  UpdateWorkoutCycleResponse,
} from '../workout-planning.models';

export interface WorkoutCycleSaved {
  response: CreateWorkoutCycleResponse | UpdateWorkoutCycleResponse;
  trainingGoal: { id: number; name: string };
}

@Component({
  selector: 'app-workout-cycle-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ButtonComponent,
    InputComponent,
  ],
  templateUrl: './workout-cycle-form.component.html',
  styleUrl: './workout-cycle-form.component.scss',
})
export class WorkoutCycleFormComponent implements OnInit {
  private readonly service = inject(WorkoutPlanningService);
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  readonly cycle = input<GetWorkoutCycleDetailResponse | null>(null);
  readonly saved = output<WorkoutCycleSaved>();
  readonly cancelled = output<void>();
  readonly busy = output<boolean>();
  readonly saving = signal(false);
  readonly goalsLoading = signal(false);
  readonly goalsError = signal(false);
  readonly goals = signal<TrainingGoalResponse[]>([]);
  readonly currentGoalUnavailable = computed(
    () =>
      this.cycle() &&
      !this.goalsLoading() &&
      !this.goalsError() &&
      !this.goals().some((goal) => goal.id === this.cycle()!.trainingGoal.id),
  );
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        (control) => (control.value.trim() ? null : { required: true }),
      ],
    }),
    trainingGoalId: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      (control) =>
        this.goals().some((goal) => goal.id === control.value) ? null : { unavailable: true },
    ]),
    desiredDurationMonths: new FormControl<number | null>(null, [
      Validators.min(1),
      (control) =>
        control.value === null || Number.isInteger(control.value) ? null : { integer: true },
    ]),
    notes: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    const cycle = this.cycle();
    if (cycle)
      this.form.reset({
        name: cycle.name,
        trainingGoalId: cycle.trainingGoal.id,
        desiredDurationMonths: cycle.desiredDurationMonths,
        notes: cycle.notes ?? '',
      });
    this.loadGoals();
  }

  loadGoals(): void {
    if (this.goalsLoading() || this.saving()) return;
    this.goalsLoading.set(true);
    this.goalsError.set(false);
    this.form.controls.trainingGoalId.disable();
    this.service
      .getTrainingGoals()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.goalsLoading.set(false)),
      )
      .subscribe({
        next: (goals) => {
          this.goals.set(goals);
          this.form.controls.trainingGoalId.enable();
        },
        error: () => this.goalsError.set(true),
      });
  }

  submit(): void {
    const cycle = this.cycle();
    if (
      this.saving() ||
      this.goalsLoading() ||
      this.goalsError() ||
      (cycle && cycle.workoutStatus !== 'NOT_STARTED' && cycle.workoutStatus !== 'IN_PROGRESS')
    )
      return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const request = {
      name: value.name.trim(),
      trainingGoalId: value.trainingGoalId!,
      desiredDurationMonths: value.desiredDurationMonths,
      notes: value.notes || null,
    };
    this.saving.set(true);
    this.busy.emit(true);
    this.form.disable();
    const operation: Observable<CreateWorkoutCycleResponse | UpdateWorkoutCycleResponse> = cycle
      ? this.service.updateWorkoutCycle(cycle.id, request)
      : this.service.createWorkoutCycle(request);
    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.form.enable();
          this.saving.set(false);
          this.busy.emit(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const goal = this.goals().find((goal) => goal.id === response.trainingGoalId)!;
          this.saved.emit({ response, trainingGoal: { id: goal.id, name: goal.name } });
        },
        error: (error) =>
          this.dialog.open({
            title: 'Não foi possível salvar o ciclo de treino',
            message: error.error?.message ?? 'Tente novamente mais tarde.',
            primaryAction: 'Ok',
          }),
      });
  }
}
