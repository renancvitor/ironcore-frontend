import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { WorkoutCycleFormComponent } from '../form/workout-cycle-form.component';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { WorkoutPlanningService } from '../workout-planning.service';
import { TrainingGoalResponse } from '../workout-planning.models';
import { buildWorkoutCycleRequest, createWorkoutCycleForm } from '../workout-cycle.form';

@Component({
  selector: 'app-workout-cycle-create',
  imports: [WorkoutCycleFormComponent],
  templateUrl: './workout-cycle-create.component.html',
  styleUrl: './workout-cycle-create.component.scss',
})
export class WorkoutCycleCreateComponent implements OnInit {
  private readonly workoutPlanningService = inject(WorkoutPlanningService);
  private readonly dialogService = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly saving = signal(false);
  readonly goals = signal<TrainingGoalResponse[]>([]);
  readonly goalsLoading = signal(false);
  readonly goalsError = signal(false);
  readonly form = createWorkoutCycleForm(this.goals);

  ngOnInit(): void {
    this.loadGoals();
  }

  loadGoals(): void {
    if (this.goalsLoading() || this.saving()) return;
    this.goalsLoading.set(true);
    this.goalsError.set(false);
    this.form.controls.trainingGoalId.disable();
    this.workoutPlanningService
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

  createCycle(): void {
    if (this.saving() || this.goalsLoading() || this.goalsError()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const request = buildWorkoutCycleRequest(this.form);
    this.saving.set(true);
    this.form.disable();
    this.workoutPlanningService
      .createWorkoutCycle(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.form.enable();
          this.saving.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          void this.router.navigate(['/workout-planning', response.id]).then((navigated) => {
            if (navigated) this.toastService.success('Ciclo de treino criado com sucesso.');
          });
        },
        error: (error) =>
          this.dialogService.open({
            title: 'Não foi possível salvar o ciclo de treino',
            message: error.error?.message ?? 'Tente novamente mais tarde.',
            primaryAction: 'Ok',
          }),
      });
  }

  cancel(): void {
    if (this.saving()) return;
    void this.router.navigate(['/workout-planning']);
  }
}
