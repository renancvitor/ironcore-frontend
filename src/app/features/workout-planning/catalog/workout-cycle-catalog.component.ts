import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { finalize, of, switchMap } from 'rxjs';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { WorkoutPlanningService } from '../workout-planning.service';
import {
  ListWorkoutCyclesResponse,
  TrainingGoalResponse,
  WorkoutStatus,
} from '../workout-planning.models';
import { WORKOUT_STATUS_LABELS } from '../workout-planning.labels';
import { WorkoutCycleCatalogStateService } from './workout-cycle-catalog-state.service';

@Component({
  selector: 'app-workout-cycle-catalog',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ButtonComponent,
    InputComponent,
    LoadingComponent,
    EmptyStateComponent,
  ],
  templateUrl: './workout-cycle-catalog.component.html',
  styleUrl: './workout-cycle-catalog.component.scss',
})
export class WorkoutCycleCatalogComponent {
  private readonly service = inject(WorkoutPlanningService);
  private readonly state = inject(WorkoutCycleCatalogStateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly cycles = signal<ListWorkoutCyclesResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly trainingGoals = signal<TrainingGoalResponse[]>([]);
  readonly goalsLoading = signal(false);
  readonly goalsError = signal(false);
  readonly statusLabels = WORKOUT_STATUS_LABELS;
  readonly statuses = Object.keys(WORKOUT_STATUS_LABELS) as WorkoutStatus[];
  readonly displayedColumns = [
    'name',
    'status',
    'goal',
    'startDate',
    'endDate',
    'duration',
    'actions',
  ];
  readonly filtersForm = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    workoutStatus: new FormControl<WorkoutStatus | null>(null),
    trainingGoalId: new FormControl<number | null>(null),
    startDate: new FormControl('', { nonNullable: true }),
    endDate: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    this.filtersForm.patchValue(this.state.filters);
    this.loadCycles();
    this.loadTrainingGoals();
  }

  loadCycles(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.service
      .listWorkoutCycles(this.state.page, this.state.size, this.state.filters)
      .pipe(
        switchMap((response) => {
          if (response.cycles.page > 0 && response.cycles.content.length === 0) {
            this.state.page = Math.max(
              0,
              Math.ceil(response.cycles.totalElements / response.cycles.size) - 1,
            );
            return this.service.listWorkoutCycles(
              this.state.page,
              this.state.size,
              this.state.filters,
            );
          }
          return of(response);
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.cycles.set(response);
          this.state.page = response.cycles.page;
          this.state.size = response.cycles.size;
        },
        error: (error) =>
          this.error.set(error.error?.message ?? 'Não foi possível carregar os ciclos de treino.'),
      });
  }

  loadTrainingGoals(): void {
    if (this.goalsLoading()) return;
    this.goalsLoading.set(true);
    this.goalsError.set(false);
    this.filtersForm.controls.trainingGoalId.disable({ emitEvent: false });
    this.service
      .getTrainingGoals()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.goalsLoading.set(false)),
      )
      .subscribe({
        next: (goals) => {
          this.trainingGoals.set(goals);
          this.filtersForm.controls.trainingGoalId.enable({ emitEvent: false });
        },
        error: () => this.goalsError.set(true),
      });
  }

  applyFilters(): void {
    if (this.loading()) return;
    const values = this.filtersForm.getRawValue();
    this.state.filters = {
      name: values.name.trim() || undefined,
      workoutStatus: values.workoutStatus ?? undefined,
      trainingGoalId: values.trainingGoalId ?? undefined,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
    };
    this.state.page = 0;
    this.loadCycles();
  }

  clearFilters(): void {
    if (this.loading()) return;
    this.filtersForm.reset();
    this.state.filters = {};
    this.state.page = 0;
    this.loadCycles();
  }

  onPageChange(event: PageEvent): void {
    if (this.loading()) return;
    this.state.page = event.pageIndex;
    this.state.size = event.pageSize;
    this.loadCycles();
  }

  openCycle(id: number): void {
    void this.router.navigate(['/workout-planning', id]);
  }

  createCycle(): void {
    void this.router.navigate(['/workout-planning/create']);
  }

  statusLabel(status: WorkoutStatus): string {
    return this.statusLabels[status];
  }

  openRowFromKeyboard(event: Event, id: number): void {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    this.openCycle(id);
  }
}
