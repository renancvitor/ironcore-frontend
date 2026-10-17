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
import { GetWorkoutCycleDetailResponse } from '../workout-planning.models';
import { WEEK_DAY_LABELS, WORKOUT_STATUS_LABELS } from '../workout-planning.labels';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { WorkoutCycleFormComponent, WorkoutCycleSaved } from '../form/workout-cycle-form.component';

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
  private readonly service = inject(WorkoutPlanningService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  readonly cycle = signal<GetWorkoutCycleDetailResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly confirmingDelete = signal(false);
  readonly busy = computed(() => this.saving() || this.deleting() || this.confirmingDelete());
  readonly canEdit = computed(() =>
    ['NOT_STARTED', 'IN_PROGRESS'].includes(this.cycle()?.workoutStatus ?? ''),
  );
  readonly canDelete = computed(() => this.cycle()?.workoutStatus === 'NOT_STARTED');
  readonly statusLabels = WORKOUT_STATUS_LABELS;
  readonly weekDayLabels = WEEK_DAY_LABELS;

  ngOnInit(): void {
    this.loadCycle();
  }

  loadCycle(): void {
    if (this.loading() || this.busy()) return;
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isSafeInteger(id) || id <= 0) {
      this.backToCycles();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.service
      .getWorkoutCycleDetail(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (cycle) => this.cycle.set(cycle),
        error: (error) =>
          this.error.set(error.error?.message ?? 'Não foi possível carregar o ciclo de treino.'),
      });
  }

  backToCycles(): void {
    if (this.busy()) return;
    void this.router.navigate(['/workout-planning']);
  }

  startEdit(): void {
    if (this.canEdit() && !this.busy() && !this.loading() && !this.error()) this.editing.set(true);
  }

  onSaved({ response, trainingGoal }: WorkoutCycleSaved): void {
    this.cycle.update((current) =>
      current
        ? {
            ...current,
            name: response.name,
            trainingGoal,
            desiredDurationMonths: response.desiredDurationMonths,
            notes: response.notes,
            workoutStatus: response.workoutStatus,
            ...('startDate' in response ? { startDate: response.startDate } : {}),
          }
        : null,
    );
    this.editing.set(false);
    this.toast.success('Ciclo de treino atualizado com sucesso.');
  }

  deleteCycle(): void {
    const cycle = this.cycle();
    if (
      !cycle ||
      !this.canDelete() ||
      this.busy() ||
      this.editing() ||
      this.loading() ||
      this.error()
    )
      return;
    this.confirmingDelete.set(true);
    this.dialog
      .open({
        title: 'Excluir ciclo de treino',
        message: `Deseja excluir o ciclo “${cycle.name}”? Todos os dias e atividades deste ciclo serão excluídos. Esta ação não pode ser desfeita.`,
        primaryAction: 'Excluir',
        secondaryAction: 'Cancelar',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.confirmingDelete.set(false)),
      )
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.deleting.set(true);
        this.service
          .deleteWorkoutCycle(cycle.id)
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.deleting.set(false)),
          )
          .subscribe({
            next: () => {
              void this.router.navigate(['/workout-planning']).then((navigated) => {
                if (navigated) this.toast.success('Ciclo de treino excluído com sucesso.');
              });
            },
            error: (error) =>
              this.dialog.open({
                title: 'Não foi possível excluir o ciclo de treino',
                message: error.error?.message ?? 'Tente novamente mais tarde.',
                primaryAction: 'Ok',
              }),
          });
      });
  }
}
