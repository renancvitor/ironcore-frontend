import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  defer,
  EMPTY,
  expand,
  finalize,
  from,
  mergeMap,
  reduce,
  repeat,
  timer,
  toArray,
} from 'rxjs';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import {
  GetWorkoutCycleDetailResponse,
  ListWorkoutCyclesItemResponse,
  WeekDay,
  WorkoutDayDetailResponse,
} from '../../../workout-planning/workout-planning.models';
import { WorkoutPlanningService } from '../../../workout-planning/workout-planning.service';
import { GetWorkoutSessionDetailResponse } from '../../../workout-sessions/workout-sessions.models';
import { WorkoutSessionsService } from '../../../workout-sessions/workout-sessions.service';
import { WorkoutSessionStartService } from '../../../workout-sessions/workout-session-start.service';
import { SummaryCardComponent } from '../summary-card/summary-card.component';

const WEEK_DAYS: WeekDay[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];
interface TodayWorkout {
  cycleId: number;
  cycleName: string;
  day: WorkoutDayDetailResponse;
}
type CurrentSession = Pick<
  GetWorkoutSessionDetailResponse,
  'id' | 'workoutDayTitleSnapshot' | 'workoutCycleNameSnapshot'
>;

@Component({
  selector: 'app-today-workouts-card',
  imports: [
    SummaryCardComponent,
    ButtonComponent,
    LoadingComponent,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  providers: [WorkoutSessionStartService],
  host: { '(window:focus)': 'onResume()', '(document:visibilitychange)': 'onResume()' },
  templateUrl: './today-workouts-card.component.html',
  styleUrl: './today-workouts-card.component.scss',
})
export class TodayWorkoutsCardComponent implements OnInit {
  private readonly planning = inject(WorkoutPlanningService);
  private readonly sessions = inject(WorkoutSessionsService);
  private readonly starter = inject(WorkoutSessionStartService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  readonly session = signal<CurrentSession | null>(null);
  readonly sessionLoading = signal(false);
  readonly sessionError = signal(false);
  readonly planningLoading = signal(false);
  readonly planningError = signal(false);
  readonly startingDayId = signal<number | null>(null);
  readonly sessionNeedsRecovery = computed(
    () => this.starter.needsRecovery() || this.starter.recovering(),
  );
  private readonly cycles = signal<GetWorkoutCycleDetailResponse[]>([]);
  private readonly today = signal(WEEK_DAYS[new Date().getDay()]);
  readonly workouts = computed<TodayWorkout[]>(() =>
    this.cycles().flatMap((cycle) => {
      if (cycle.workoutStatus !== 'IN_PROGRESS') return [];
      const days = [...cycle.days];
      days.sort((a, b) => a.sortOrder - b.sortOrder);
      return days
        .filter((day) => day.weekDay === this.today())
        .map((day) => ({ cycleId: cycle.id, cycleName: cycle.name, day }));
    }),
  );
  readonly startBlocked = computed(
    () =>
      !!this.session() ||
      this.sessionLoading() ||
      this.sessionError() ||
      this.planningLoading() ||
      this.planningError() ||
      this.startingDayId() !== null,
  );

  ngOnInit(): void {
    this.loadSession();
    this.loadPlanning();
    defer(() => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return timer(midnight.getTime() - now.getTime());
    })
      .pipe(repeat(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateToday());
  }

  updateToday(): void {
    this.today.set(WEEK_DAYS[new Date().getDay()]);
  }

  onResume(): void {
    if (this.document.visibilityState !== 'visible') return;
    this.updateToday();
    this.loadSession();
  }

  sessionActionLabel(dayId: number): string {
    const busy = this.startingDayId() === dayId;
    if (this.sessionNeedsRecovery()) return busy ? 'Verificando sessão' : 'Verificar sessão';
    return busy ? 'Iniciando sessão' : 'Iniciar sessão';
  }

  loadSession(): void {
    if (this.sessionLoading() || this.startingDayId() !== null) return;
    this.sessionLoading.set(true);
    this.sessionError.set(false);
    this.sessions
      .getInProgressWorkoutSession()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.sessionLoading.set(false)),
      )
      .subscribe({
        next: (session) => this.session.set(session),
        error: () => this.sessionError.set(true),
      });
  }

  loadPlanning(): void {
    if (this.planningLoading()) return;
    this.updateToday();
    this.planningLoading.set(true);
    this.planningError.set(false);
    const page = (index: number) =>
      this.planning.listWorkoutCycles(index, 20, { workoutStatus: 'IN_PROGRESS' });
    page(0)
      .pipe(
        expand((response) => (response.cycles.last ? EMPTY : page(response.cycles.page + 1))),
        reduce(
          (cycles, response) => [...cycles, ...response.cycles.content],
          [] as ListWorkoutCyclesItemResponse[],
        ),
        mergeMap((cycles) =>
          from([
            ...new Map(
              cycles
                .filter((cycle) => cycle.workoutStatus === 'IN_PROGRESS')
                .map((cycle) => [cycle.id, cycle]),
            ).values(),
          ]),
        ),
        mergeMap((cycle) => this.planning.getWorkoutCycleDetail(cycle.id), 4),
        toArray(),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.planningLoading.set(false)),
      )
      .subscribe({
        next: (cycles) => {
          cycles.sort((a, b) => a.id - b.id);
          this.cycles.set(cycles);
        },
        error: () => {
          this.cycles.set([]);
          this.planningError.set(true);
        },
      });
  }

  continueSession(): void {
    if (this.session()) void this.router.navigate(['/workout-sessions', this.session()!.id]);
  }

  startSession(workout: TodayWorkout): void {
    this.updateToday();
    if (
      this.startBlocked() ||
      !workout.day.activities.length ||
      !this.workouts().some(
        (item) => item.cycleId === workout.cycleId && item.day.id === workout.day.id,
      )
    )
      return;
    this.startingDayId.set(workout.day.id);
    this.starter
      .start(
        { workoutCycleId: workout.cycleId, workoutDayId: workout.day.id },
        () => this.loadPlanning(),
        (session) => this.session.set(session),
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.startingDayId.set(null)),
      )
      .subscribe((response) => {
        if (!response) return;
        this.session.set({
          id: response.id,
          workoutDayTitleSnapshot: workout.day.title,
          workoutCycleNameSnapshot: workout.cycleName,
        });
        this.toast.success('Sessão de treino iniciada com sucesso.');
        void this.router.navigate(['/workout-sessions', response.id]);
      });
  }
}
