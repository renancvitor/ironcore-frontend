import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { catchError, defer, EMPTY, finalize, Subject, switchMap } from 'rxjs';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageResult } from '../../../shared/models/page-result.model';
import { WorkoutPlanningService } from '../../workout-planning/workout-planning.service';
import {
  ListWorkoutCyclesItemResponse,
  WorkoutDayDetailResponse,
} from '../../workout-planning/workout-planning.models';
import { WEEK_DAY_LABELS } from '../../workout-planning/workout-planning.labels';
import { WORKOUT_SESSION_CLOSE_REASON_LABELS } from '../workout-sessions.labels';
import { WorkoutSessionHistoryItem } from '../workout-sessions.models';
import { WorkoutSessionsService } from '../workout-sessions.service';
import { WorkoutSessionHistoryState } from './workout-session-history-state.service';
import { progressNavigationQuery } from '../progress/workout-session-progress.utils';

const positiveId: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  control.value === null ||
  control.value === '' ||
  (Number.isSafeInteger(control.value) && control.value > 0)
    ? null
    : { positiveId: true };

const isoDate: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: string = control.value;
  if (!value) return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return { date: true };
  const year = Number(parts[1]),
    month = Number(parts[2]),
    day = Number(parts[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
    ? null
    : { date: true };
};

@Component({
  selector: 'app-workout-session-history',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    ButtonComponent,
    LoadingComponent,
    EmptyStateComponent,
  ],
  templateUrl: './workout-session-history.component.html',
  styleUrl: './workout-session-history.component.scss',
})
export class WorkoutSessionHistoryComponent {
  private readonly service = inject(WorkoutSessionsService);
  private readonly planning = inject(WorkoutPlanningService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = inject(WorkoutSessionHistoryState);
  private readonly selectedCycle = signal(this.state.selectedCycle);
  private readonly requests = new Subject<void>();
  private readonly cycleRequests = new Subject<number>();
  private readonly dayRequests = new Subject<number | null>();
  private requestKey = '';
  readonly result = signal<PageResult<WorkoutSessionHistoryItem> | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly cycles = signal<ListWorkoutCyclesItemResponse[]>([]);
  readonly cyclesLoading = signal(false);
  readonly cyclesError = signal('');
  readonly cyclePage = signal<PageResult<ListWorkoutCyclesItemResponse> | null>(null);
  readonly days = signal<WorkoutDayDetailResponse[]>([]);
  readonly daysLoading = signal(false);
  readonly daysError = signal('');
  readonly cycleSearch = new FormControl('', { nonNullable: true });
  private appliedCycleSearch = '';
  readonly weekDayLabels = WEEK_DAY_LABELS;
  readonly closeReasonLabels = WORKOUT_SESSION_CLOSE_REASON_LABELS;
  readonly filtered = computed(() => {
    this.result();
    return Object.values(this.state.filters).some((value) => value !== undefined && value !== '');
  });
  readonly filtersForm = new FormGroup(
    {
      workoutCycleId: new FormControl<number | null>(null, positiveId),
      workoutDayId: new FormControl<number | null>(null, positiveId),
      startDate: new FormControl('', { nonNullable: true, validators: isoDate }),
      endDate: new FormControl('', { nonNullable: true, validators: isoDate }),
    },
    {
      validators: (group) => {
        const start: string = group.get('startDate')?.value;
        const end: string = group.get('endDate')?.value;
        return start && end && start > end ? { dateRange: true } : null;
      },
    },
  );

  constructor() {
    this.filtersForm.patchValue(
      {
        workoutCycleId: this.state.filters.workoutCycleId ?? null,
        workoutDayId: this.state.filters.workoutDayId ?? null,
        startDate: this.state.filters.startDate ?? '',
        endDate: this.state.filters.endDate ?? '',
      },
      { emitEvent: false },
    );
    this.requests
      .pipe(
        switchMap(() =>
          defer(() => {
            this.loading.set(true);
            this.error.set('');
            return this.service
              .listWorkoutSessions(this.state.page, this.state.size, this.state.filters)
              .pipe(
                catchError(() => {
                  this.error.set(
                    'Não foi possível carregar o histórico de sessões. Tente novamente.',
                  );
                  return EMPTY;
                }),
                finalize(() => this.loading.set(false)),
              );
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ sessions }) => {
        this.result.set(sessions);
        this.state.page = sessions.page;
        this.state.size = sessions.size;
      });
    this.cycleRequests
      .pipe(
        switchMap((page) =>
          defer(() => {
            this.cyclesLoading.set(true);
            this.cyclesError.set('');
            return this.planning
              .listWorkoutCycles(page, 20, { name: this.appliedCycleSearch || undefined })
              .pipe(
                catchError(() => {
                  this.cyclesError.set('Não foi possível buscar ciclos. Tente buscar novamente.');
                  return EMPTY;
                }),
                finalize(() => this.cyclesLoading.set(false)),
              );
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ cycles }) => {
        this.cycles.update((previous) =>
          cycles.page === 0 ? cycles.content : [...previous, ...cycles.content],
        );
        this.cyclePage.set(cycles);
      });
    this.dayRequests
      .pipe(
        switchMap((id) => {
          this.days.set([]);
          this.daysError.set('');
          if (id === null || !Number.isSafeInteger(id) || id <= 0) return EMPTY;
          return defer(() => {
            this.daysLoading.set(true);
            return this.planning.getWorkoutCycleDetail(id).pipe(
              catchError(() => {
                this.daysError.set(
                  'Não foi possível consultar os treinos deste ciclo. Tente novamente ou informe o código do treino.',
                );
                return EMPTY;
              }),
              finalize(() => this.daysLoading.set(false)),
            );
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((cycle) => this.days.set(cycle.days));
    this.filtersForm.controls.workoutCycleId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.filtersForm.controls.workoutDayId.reset(null);
        const cycle = this.cycleOptions().find((cycle) => cycle.id === id);
        this.selectedCycle.set(cycle ? { id: cycle.id, name: cycle.name } : null);
        this.dayRequests.next(id);
      });
    if (this.state.filters.workoutCycleId) this.dayRequests.next(this.state.filters.workoutCycleId);
    this.load();
  }

  cycleOptions(): { id: number; name: string }[] {
    const selected = this.selectedCycle();
    return selected && !this.cycles().some((cycle) => cycle.id === selected.id)
      ? [selected, ...this.cycles()]
      : this.cycles();
  }

  searchCycles(): void {
    this.appliedCycleSearch = this.cycleSearch.value.trim();
    this.cyclePage.set(null);
    this.cycles.set([]);
    this.cycleRequests.next(0);
  }

  moreCycles(): void {
    const page = this.cyclePage();
    if (page && !page.last && !this.cyclesLoading()) this.cycleRequests.next(page.page + 1);
  }

  retryDays(): void {
    this.dayRequests.next(this.filtersForm.controls.workoutCycleId.value);
  }
  load(): void {
    const key = JSON.stringify([this.state.page, this.state.size, this.state.filters]);
    if (this.loading() && key === this.requestKey) return;
    this.requestKey = key;
    this.requests.next();
  }

  applyFilters(): void {
    this.filtersForm.markAllAsTouched();
    if (this.filtersForm.invalid) return;
    const values = this.filtersForm.getRawValue();
    this.state.filters = {
      workoutCycleId: values.workoutCycleId ?? undefined,
      workoutDayId: values.workoutDayId ?? undefined,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
    };
    this.state.selectedCycle = this.selectedCycle();
    this.state.page = 0;
    this.load();
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.state.filters = {};
    this.state.selectedCycle = null;
    this.state.page = 0;
    this.load();
  }

  onPageChange(event: PageEvent): void {
    this.state.page = event.pageSize === this.state.size ? event.pageIndex : 0;
    this.state.size = event.pageSize;
    this.load();
  }

  openSession(id: number): void {
    void this.router.navigate(['/workout-sessions', id], {
      queryParams: { ...progressNavigationQuery(this.route.snapshot.queryParamMap), from: 'history' },
    });
  }

  openProgress(): void {
    void this.router.navigate(['/workout-sessions/progress'], {
      queryParams: progressNavigationQuery(this.route.snapshot.queryParamMap),
    });
  }
}
