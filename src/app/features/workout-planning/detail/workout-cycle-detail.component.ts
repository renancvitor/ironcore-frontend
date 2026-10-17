import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize, Observable } from 'rxjs';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { WorkoutPlanningService } from '../workout-planning.service';
import {
  GetWorkoutCycleDetailResponse,
  TrainingGoalResponse,
  UpdateWorkoutCycleResponse,
  WorkoutDayDetailResponse,
  WeekDay,
} from '../workout-planning.models';
import { WEEK_DAY_LABELS, WORKOUT_STATUS_LABELS } from '../workout-planning.labels';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { WorkoutCycleFormComponent } from '../form/workout-cycle-form.component';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { buildWorkoutCycleRequest, createWorkoutCycleForm } from '../workout-cycle.form';
import { WorkoutDayFormComponent } from '../form/workout-day-form.component';
import { createWorkoutDayForm } from '../workout-day.form';

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
    WorkoutDayFormComponent,
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
  readonly weekDays = Object.keys(WEEK_DAY_LABELS) as WeekDay[];
  readonly orderedDays = computed(() =>
    [...(this.cycle()?.days ?? [])].sort(
      (a, b) =>
        this.weekDays.indexOf(a.weekDay) - this.weekDays.indexOf(b.weekDay) ||
        a.sortOrder - b.sortOrder,
    ),
  );
  readonly dayMode = signal<'create' | 'edit' | 'reorder' | null>(null);
  readonly selectedDay = signal<WorkoutDayDetailResponse | null>(null);
  readonly daySaving = signal(false);
  readonly daysLoading = signal(false);
  readonly confirmingDelete = signal(false);
  readonly dayBusy = computed(
    () => this.daySaving() || this.daysLoading() || this.confirmingDelete(),
  );
  dayForm = createWorkoutDayForm('create', () => this.cycle()?.days ?? []);

  ngOnInit(): void {
    this.loadCycle();
  }

  loadCycle(): void {
    if (this.loading() || this.saving() || this.dayBusy()) return;
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
    if (this.saving() || this.dayBusy()) return;
    void this.router.navigate(['/workout-planning']);
  }

  startEdit(): void {
    const cycle = this.cycle();
    if (
      !cycle ||
      !this.canEdit() ||
      this.saving() ||
      this.editing() ||
      this.error() ||
      this.dayBusy() ||
      this.dayMode()
    )
      return;
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
    if (this.saving()) return;
    this.editing.set(false);
    this.clearEditQuery();
  }

  private clearEditQuery(): void {
    if (this.route.snapshot.queryParamMap?.get('edit') !== 'true') return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { edit: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  openDayForm(
    mode: 'create' | 'edit' | 'reorder',
    day: WorkoutDayDetailResponse | null = null,
  ): void {
    if (!this.canMutateDays() || this.dayMode()) return;
    if (mode !== 'create' && (!day || !this.cycle()?.days.some((item) => item.id === day.id)))
      return;
    this.selectedDay.set(day);
    this.dayMode.set(mode);
    this.dayForm = createWorkoutDayForm(mode, () => this.cycle()?.days ?? [], day?.id);
    this.dayForm.reset({
      title: day?.title ?? '',
      weekDay: day?.weekDay ?? 'SUNDAY',
      sortOrder: day?.sortOrder ?? 1,
    });
  }

  cancelDayForm(): void {
    if (!this.dayBusy()) this.dayMode.set(null);
  }

  saveDay(): void {
    if (!this.canMutateDays()) return;
    if (this.dayForm.invalid) {
      this.dayForm.markAllAsTouched();
      return;
    }
    const value = this.dayForm.getRawValue();
    const mode = this.dayMode();
    const day = this.selectedDay();
    if (mode === 'create') {
      this.mutateDay(
        this.workoutPlanningService.createWorkoutDay({
          workoutCycleId: this.cycle()!.id,
          weekDay: value.weekDay,
          title: value.title.trim(),
        }),
        'Dia de treino criado com sucesso.',
      );
    } else if (mode === 'edit' && day) {
      this.mutateDay(
        this.workoutPlanningService.updateWorkoutDay(day.id, { title: value.title.trim() }),
        'Dia de treino atualizado com sucesso.',
      );
    } else if (mode === 'reorder' && day) {
      this.mutateDay(
        this.workoutPlanningService.reorderWorkoutDay(day.id, {
          weekDay: value.weekDay,
          sortOrder: value.sortOrder,
        }),
        'Dia de treino reordenado com sucesso.',
      );
    }
  }

  deleteDay(day: WorkoutDayDetailResponse): void {
    if (
      !this.canMutateDays() ||
      this.dayMode() ||
      !this.cycle()?.days.some((item) => item.id === day.id)
    )
      return;
    this.confirmingDelete.set(true);
    this.dialogService
      .open({
        title: 'Excluir dia de treino',
        message: `Deseja excluir o dia “${day.title}”? As atividades vinculadas também serão removidas. Esta ação não pode ser desfeita.`,
        primaryAction: 'Excluir',
        secondaryAction: 'Cancelar',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.confirmingDelete.set(false)),
      )
      .subscribe((confirmed) => {
        if (!confirmed || !this.canEdit() || this.saving() || this.editing()) return;
        this.mutateDay(
          this.workoutPlanningService.deleteWorkoutDay(day.id),
          'Dia de treino excluído com sucesso.',
        );
      });
  }

  private canMutateDays(): boolean {
    return (
      !!this.cycle() &&
      this.canEdit() &&
      !this.editing() &&
      !this.saving() &&
      !this.loading() &&
      !this.error() &&
      !this.dayBusy()
    );
  }

  private mutateDay(operation: Observable<unknown>, message: string): void {
    const cycleId = this.cycle()!.id;
    this.daySaving.set(true);
    this.dayForm.disable();
    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.dayForm.enable();
          this.daySaving.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.dayMode.set(null);
          this.toastService.success(message);
          this.loadDays(cycleId);
        },
        error: (error) =>
          this.dialogService.open({
            title: 'Não foi possível alterar o dia de treino',
            message: error.error?.message ?? 'Tente novamente mais tarde.',
            primaryAction: 'Ok',
          }),
      });
  }

  private loadDays(cycleId: number): void {
    this.daysLoading.set(true);
    this.workoutPlanningService
      .getWorkoutCycleDetail(cycleId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.daysLoading.set(false)),
      )
      .subscribe({
        next: (cycle) => this.cycle.set(cycle),
        error: () =>
          this.error.set(
            'A alteração foi salva, mas não foi possível atualizar a composição. Tente carregar o ciclo novamente.',
          ),
      });
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
    this.clearEditQuery();
    this.toastService.success('Ciclo de treino atualizado com sucesso.');
  }
}
