import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { WorkoutPlanningService } from '../workout-planning.service';
import {
  GetWorkoutCycleDetailResponse,
  TrainingGoalResponse,
  UpdateWorkoutCycleResponse,
} from '../workout-planning.models';
import { WEEK_DAY_LABELS, WORKOUT_STATUS_LABELS } from '../workout-planning.labels';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { WorkoutCycleFormComponent } from '../form/workout-cycle-form.component';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { buildWorkoutCycleRequest, createWorkoutCycleForm } from '../workout-cycle.form';

@Component({
  selector: 'app-workout-cycle-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    LoadingComponent,
    ButtonComponent,
    EmptyStateComponent,
    WorkoutCycleFormComponent,
  ],
  templateUrl: './workout-cycle-detail.component.html',
  styleUrl: './workout-cycle-detail.component.scss',
})
export class WorkoutCycleDetailComponent implements OnInit {
  private readonly workoutPlanningService = inject(WorkoutPlanningService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(DialogService);
  readonly goals = signal<TrainingGoalResponse[]>([]);
  readonly goalsLoading = signal(false);
  readonly goalsError = signal(false);
  readonly form = createWorkoutCycleForm(this.goals);
  readonly cycle = signal<GetWorkoutCycleDetailResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly canEdit = computed(() =>
    ['NOT_STARTED', 'IN_PROGRESS'].includes(this.cycle()?.workoutStatus ?? ''),
  );
  readonly statusLabels = WORKOUT_STATUS_LABELS;
  readonly weekDayLabels = WEEK_DAY_LABELS;

  ngOnInit(): void {
    this.loadCycle();
  }

  loadCycle(): void {
    if (this.loading() || this.saving()) return;
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isSafeInteger(id) || id <= 0) {
      this.backToCycles();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.workoutPlanningService
      .getWorkoutCycleDetail(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (cycle) => {
          this.cycle.set(cycle);
          if (this.route.snapshot.queryParamMap?.get('edit') === 'true' && this.canEdit()) {
            this.startEdit();
          }
        },
        error: (error) =>
          this.error.set(error.error?.message ?? 'Não foi possível carregar o ciclo de treino.'),
      });
  }

  backToCycles(): void {
    if (this.saving()) return;
    void this.router.navigate(['/workout-planning']);
  }

  startEdit(): void {
    const cycle = this.cycle();
    if (!cycle || !this.canEdit() || this.saving() || this.editing() || this.error()) return;
    this.form.reset({
      name: cycle.name,
      trainingGoalId: cycle.trainingGoal.id,
      desiredDurationMonths: cycle.desiredDurationMonths,
      notes: cycle.notes ?? '',
    });
    this.editing.set(true);
    this.loadGoals();
  }

  cancelEdit(): void {
    if (!this.saving()) this.editing.set(false);
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

  save(): void {
    const cycle = this.cycle();
    if (
      !cycle ||
      !this.editing() ||
      !this.canEdit() ||
      this.saving() ||
      this.goalsLoading() ||
      this.goalsError()
    )
      return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const request = buildWorkoutCycleRequest(this.form);
    this.saving.set(true);
    this.form.disable();
    this.workoutPlanningService
      .updateWorkoutCycle(cycle.id, request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.form.enable();
          this.saving.set(false);
        }),
      )
      .subscribe({
        next: (response) => this.onSaved(response),
        error: (error) =>
          this.dialogService.open({
            title: 'Não foi possível salvar o ciclo de treino',
            message: error.error?.message ?? 'Tente novamente mais tarde.',
            primaryAction: 'Ok',
          }),
      });
  }

  private onSaved(response: UpdateWorkoutCycleResponse): void {
    const goal = this.goals().find((goal) => goal.id === response.trainingGoalId)!;
    this.cycle.update((current) =>
      current
        ? {
            ...current,
            name: response.name,
            trainingGoal: { id: goal.id, name: goal.name },
            desiredDurationMonths: response.desiredDurationMonths,
            notes: response.notes,
            workoutStatus: response.workoutStatus,
            startDate: response.startDate,
          }
        : null,
    );
    this.editing.set(false);
    this.toastService.success('Ciclo de treino atualizado com sucesso.');
  }
}
