import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, of, switchMap } from 'rxjs';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { WORKOUT_STATUS_LABELS } from '../../../workout-planning/workout-planning.labels';
import { ListWorkoutCyclesResponse } from '../../../workout-planning/workout-planning.models';
import { WorkoutPlanningService } from '../../../workout-planning/workout-planning.service';
import { SummaryCardComponent } from '../summary-card/summary-card.component';

@Component({
  selector: 'app-in-progress-workouts-card',
  imports: [
    SummaryCardComponent,
    EmptyStateComponent,
    LoadingComponent,
    ButtonComponent,
    RouterLink,
  ],
  templateUrl: './in-progress-workouts-card.component.html',
  styleUrl: './in-progress-workouts-card.component.scss',
})
export class InProgressWorkoutsCardComponent implements OnInit {
  private readonly service = inject(WorkoutPlanningService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly summarySize = 3;
  readonly response = signal<ListWorkoutCyclesResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly statusLabels = WORKOUT_STATUS_LABELS;
  readonly cycles = computed(() => {
    const today = new Date();
    const current = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    return (this.response()?.cycles.content ?? []).map((cycle) => {
      const days =
        cycle.workoutStatus === 'IN_PROGRESS' && cycle.startDate
          ? (current - Date.parse(`${cycle.startDate}T00:00:00Z`)) / 86_400_000
          : null;
      return {
        ...cycle,
        elapsedDays: days !== null && Number.isInteger(days) && days >= 0 ? days : null,
      };
    });
  });

  ngOnInit(): void {
    this.loadCycles();
  }

  loadCycles(): void {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(false);
    this.response.set(null);
    this.service
      .listWorkoutCycles(0, this.summarySize, { workoutStatus: 'IN_PROGRESS' })
      .pipe(
        switchMap((response) =>
          response.cycles.content.length
            ? of(response)
            : this.service.listWorkoutCycles(0, this.summarySize, { workoutStatus: 'NOT_STARTED' }),
        ),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => this.response.set(response),
        error: () => this.error.set(true),
      });
  }
}
