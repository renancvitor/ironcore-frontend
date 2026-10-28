import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  catchError,
  defer,
  EMPTY,
  finalize,
  merge,
  Observable,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { progressPeriodError } from '../../../shared/utils/progress-period.utils';
import { ExerciseCatalogComponent } from '../../exercise/catalog/exercise-catalog.component';
import { ExerciseCatalogStateService } from '../../exercise/catalog/exercise-catalog-state.service';
import { ListExercisesItemResponse } from '../../exercise/exercise.models';
import {
  ExerciseCardioEvolutionResponse,
  ExerciseStrengthEvolutionResponse,
  WorkoutSessionAnalyticsPeriod,
} from '../workout-session-analytics.models';
import { WorkoutSessionsService } from '../workout-sessions.service';
import { WorkoutSessionProgressChartComponent } from './chart/workout-session-progress-chart.component';
import {
  ANALYTICS_INDICATORS,
  AnalyticsFamily,
  AnalyticsIndicator,
  formatAnalyticsValue,
  metricValue,
  readProgressQuery,
  saoPauloDate,
  sessionProgressPeriod,
} from './workout-session-progress.utils';

interface AnalyticsContext {
  exerciseId: number;
  period: WorkoutSessionAnalyticsPeriod;
}

@Component({
  selector: 'app-workout-session-progress',
  providers: [ExerciseCatalogStateService],
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ButtonComponent,
    EmptyStateComponent,
    LoadingComponent,
    ExerciseCatalogComponent,
    WorkoutSessionProgressChartComponent,
  ],
  templateUrl: './workout-session-progress.component.html',
  styleUrl: './workout-session-progress.component.scss',
})
export class WorkoutSessionProgressComponent {
  private readonly service = inject(WorkoutSessionsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly contexts = new Subject<AnalyticsContext | null>();
  private readonly strengthRetries = new Subject<void>();
  private readonly cardioRetries = new Subject<void>();
  private contextKey = '';
  private autoSelect = true;
  private readonly selectedName = signal<{ id: number; name: string } | null>(null);
  readonly exerciseId = signal<number | null>(null);
  readonly sourceSessionId = signal<number | null>(null);
  private sourceDate: string | null = null;
  readonly period = signal(sessionProgressPeriod());
  readonly periodIsValid = computed(() => !progressPeriodError(this.period(), this.today));
  readonly family = signal<AnalyticsFamily>('strength');
  readonly indicator = signal<AnalyticsIndicator>(ANALYTICS_INDICATORS[0]);
  readonly strength = signal<ExerciseStrengthEvolutionResponse | null>(null);
  readonly cardio = signal<ExerciseCardioEvolutionResponse | null>(null);
  readonly strengthLoading = signal(false);
  readonly cardioLoading = signal(false);
  readonly strengthError = signal('');
  readonly cardioError = signal('');
  readonly validationError = signal('');
  readonly invalidExercise = signal(false);
  readonly choosingExercise = signal(false);
  readonly families: { key: AnalyticsFamily; label: string }[] = [
    { key: 'strength', label: 'Força' },
    { key: 'cardio', label: 'Cardio' },
  ];
  readonly indicators = computed(() =>
    ANALYTICS_INDICATORS.filter((item) => item.family === this.family()),
  );
  readonly response = computed(() =>
    this.family() === 'strength' ? this.strength() : this.cardio(),
  );
  readonly loading = computed(() =>
    this.family() === 'strength' ? this.strengthLoading() : this.cardioLoading(),
  );
  readonly error = computed(() =>
    this.family() === 'strength' ? this.strengthError() : this.cardioError(),
  );
  readonly exerciseName = computed(
    () =>
      this.strength()?.points.at(-1)?.exerciseNameSnapshot ??
      this.cardio()?.points.at(-1)?.exerciseNameSnapshot ??
      (this.selectedName()?.id === this.exerciseId() ? this.selectedName()?.name : null) ??
      'Exercício selecionado',
  );
  readonly hasValues = computed(() => this.isAvailable(this.indicator()));
  readonly formatValue = formatAnalyticsValue;
  readonly form = new FormGroup({
    startDate: new FormControl(this.period().startDate, { nonNullable: true }),
    endDate: new FormControl(this.period().endDate, { nonNullable: true }),
  });

  constructor() {
    const state = this.router.currentNavigation()?.extras.state;
    const initialId = readProgressQuery(this.route.snapshot.queryParamMap).exerciseId;
    if (initialId && typeof state?.['exerciseName'] === 'string') {
      this.selectedName.set({ id: initialId, name: state['exerciseName'].slice(0, 150) });
    }
    this.contexts
      .pipe(
        switchMap((context) =>
          defer(() => {
            this.strength.set(null);
            this.cardio.set(null);
            this.strengthError.set('');
            this.cardioError.set('');
            this.strengthLoading.set(context !== null);
            this.cardioLoading.set(context !== null);
            if (!context) return EMPTY;
            return merge(
              this.strengthRetries.pipe(
                startWith(undefined),
                switchMap(() => this.loadStrength(context)),
              ),
              this.cardioRetries.pipe(
                startWith(undefined),
                switchMap(() => this.loadCardio(context)),
              ),
            );
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const selection = readProgressQuery(params, this.today);
      this.autoSelect = params.get('metric') !== selection.indicator.key;
      this.exerciseId.set(selection.exerciseId);
      this.invalidExercise.set(selection.invalidExercise);
      this.sourceSessionId.set(selection.sourceSessionId);
      this.sourceDate = selection.sourceDate;
      const periodChanged =
        this.period().startDate !== selection.period.startDate ||
        this.period().endDate !== selection.period.endDate;
      this.period.set(selection.period);
      if (periodChanged || this.contextKey === '') {
        this.form.setValue(selection.period, { emitEvent: false });
        this.validationError.set(selection.error);
      }
      this.family.set(selection.family);
      this.indicator.set(selection.indicator);
      const context =
        selection.exerciseId && !selection.error
          ? { exerciseId: selection.exerciseId, period: selection.period }
          : null;
      const key = JSON.stringify(context);
      if (key !== this.contextKey) {
        this.contextKey = key;
        this.contexts.next(context);
      } else if (context) {
        this.selectInitialIndicator();
      }
    });
  }

  get today(): string {
    return saoPauloDate();
  }

  isAvailable(indicator: AnalyticsIndicator): boolean {
    const response = indicator.family === 'strength' ? this.strength() : this.cardio();
    return response?.points.some((point) => metricValue(point, indicator.key) !== null) ?? false;
  }

  selectFamily(family: AnalyticsFamily): void {
    this.autoSelect = false;
    this.family.set(family);
    this.indicator.set(
      ANALYTICS_INDICATORS.find((item) => item.family === family && this.isAvailable(item)) ??
        ANALYTICS_INDICATORS.find((item) => item.family === family)!,
    );
    this.persistSelection();
  }

  selectIndicator(indicator: AnalyticsIndicator): void {
    if (!this.isAvailable(indicator)) return;
    this.autoSelect = false;
    this.indicator.set(indicator);
    this.persistSelection();
  }

  confirmExercise(exercises: ListExercisesItemResponse[]): void {
    const exercise = exercises[0];
    if (!exercise) return;
    this.selectedName.set({ id: exercise.id, name: exercise.name });
    this.choosingExercise.set(false);
    const query = this.selectionQuery();
    void this.router.navigate(['/workout-sessions/progress'], {
      queryParams: {
        ...query,
        exerciseId: exercise.id,
        metric: null,
        sourceSessionId: null,
        sourceDate: null,
      },
      replaceUrl: true,
    });
  }

  applyPeriod(): void {
    const period = this.form.getRawValue();
    const error = progressPeriodError(period, this.today);
    this.validationError.set(error);
    if (error) return;
    void this.router.navigate(['/workout-sessions/progress'], {
      queryParams: { ...this.selectionQuery(), ...period },
      replaceUrl: true,
    });
  }

  retry(family: AnalyticsFamily): void {
    if (!this.exerciseId() || progressPeriodError(this.period(), this.today)) return;
    if (family === 'strength' && !this.strengthLoading()) this.strengthRetries.next();
    if (family === 'cardio' && !this.cardioLoading()) this.cardioRetries.next();
  }

  openSession(id: number): void {
    void this.router.navigate(['/workout-sessions', id], {
      queryParams: { ...this.selectionQuery(), from: 'progress' },
    });
  }

  openHistory(): void {
    void this.router.navigate(['/workout-sessions/history'], {
      queryParams: this.selectionQuery(),
    });
  }

  back(): void {
    const id = this.sourceSessionId();
    if (id) {
      void this.router.navigate(['/workout-sessions', id], {
        queryParams: { ...this.selectionQuery(), from: 'history' },
      });
    } else this.openHistory();
  }

  private selectionQuery(): Params {
    return {
      exerciseId: this.exerciseId(),
      ...this.period(),
      family: this.family(),
      metric: this.indicator().key,
      sourceSessionId: this.sourceSessionId(),
      sourceDate: this.sourceDate,
    };
  }

  private persistSelection(): void {
    void this.router.navigate(['/workout-sessions/progress'], {
      queryParams: this.selectionQuery(),
      replaceUrl: true,
    });
  }

  private selectInitialIndicator(): void {
    if (!this.autoSelect || this.strengthLoading() || this.cardioLoading()) return;
    const available =
      ANALYTICS_INDICATORS.find(
        (item) => item.family === this.family() && this.isAvailable(item),
      ) ?? ANALYTICS_INDICATORS.find((item) => this.isAvailable(item));
    if (available) {
      this.family.set(available.family);
      this.indicator.set(available);
    }
    this.autoSelect = false;
    this.persistSelection();
  }

  private loadStrength(context: AnalyticsContext): Observable<ExerciseStrengthEvolutionResponse> {
    return defer(() => {
      this.strengthLoading.set(true);
      this.strengthError.set('');
      return this.service.getStrengthEvolution(context.exerciseId, context.period).pipe(
        tap((response) => {
          this.strength.set(response);
          this.strengthLoading.set(false);
          this.selectInitialIndicator();
        }),
        catchError((error) => {
          this.strengthError.set(
            error.error?.message ||
              'Não foi possível carregar os indicadores de força. Tente novamente.',
          );
          this.strengthLoading.set(false);
          this.selectInitialIndicator();
          return EMPTY;
        }),
        finalize(() => this.strengthLoading.set(false)),
      );
    });
  }

  private loadCardio(context: AnalyticsContext): Observable<ExerciseCardioEvolutionResponse> {
    return defer(() => {
      this.cardioLoading.set(true);
      this.cardioError.set('');
      return this.service.getCardioEvolution(context.exerciseId, context.period).pipe(
        tap((response) => {
          this.cardio.set(response);
          this.cardioLoading.set(false);
          this.selectInitialIndicator();
        }),
        catchError((error) => {
          this.cardioError.set(
            error.error?.message ||
              'Não foi possível carregar os indicadores de cardio. Tente novamente.',
          );
          this.cardioLoading.set(false);
          this.selectInitialIndicator();
          return EMPTY;
        }),
        finalize(() => this.cardioLoading.set(false)),
      );
    });
  }
}
