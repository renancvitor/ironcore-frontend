import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { catchError, defer, EMPTY, finalize, Subject, switchMap } from 'rxjs';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageResult } from '../../../shared/models/page-result.model';
import { WEEK_DAY_LABELS } from '../../workout-planning/workout-planning.labels';
import { WORKOUT_SESSION_CLOSE_REASON_LABELS } from '../workout-sessions.labels';
import { WorkoutSessionHistoryItem } from '../workout-sessions.models';
import { WorkoutSessionsService } from '../workout-sessions.service';
import { WorkoutSessionHistoryState } from './workout-session-history-state.service';
import { progressNavigationQuery } from '../progress/workout-session-progress.utils';

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
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatTableModule,
    ButtonComponent,
    LoadingComponent,
    EmptyStateComponent,
  ],
  templateUrl: './workout-session-history.component.html',
  styleUrl: './workout-session-history.component.scss',
})
export class WorkoutSessionHistoryComponent {
  private readonly service = inject(WorkoutSessionsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = inject(WorkoutSessionHistoryState);
  private readonly requests = new Subject<void>();
  private requestKey = '';
  readonly result = signal<PageResult<WorkoutSessionHistoryItem> | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly weekDayLabels = WEEK_DAY_LABELS;
  readonly closeReasonLabels = WORKOUT_SESSION_CLOSE_REASON_LABELS;
  readonly displayedColumns = [
    'workout',
    'cycle',
    'weekDay',
    'performedOn',
    'startedAt',
    'finishedAt',
    'closeReason',
  ];
  readonly filtered = computed(() => {
    this.result();
    return Object.values(this.state.filters).some((value) => value !== undefined && value !== '');
  });
  readonly filtersForm = new FormGroup(
    {
      name: new FormControl('', { nonNullable: true }),
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
        name: this.state.filters.name ?? '',
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
    this.load();
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
      name: values.name.trim() || undefined,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
    };
    this.state.page = 0;
    this.load();
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.state.filters = {};
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
      queryParams: {
        ...progressNavigationQuery(this.route.snapshot.queryParamMap),
        from: 'history',
      },
    });
  }

  openRowFromKeyboard(event: Event, id: number): void {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    this.openSession(id);
  }

  weekDayLabel(session: WorkoutSessionHistoryItem): string {
    return this.weekDayLabels[session.weekDaySnapshot];
  }

  closeReasonLabel(session: WorkoutSessionHistoryItem): string {
    return this.closeReasonLabels[session.closeReason];
  }

  openProgress(): void {
    void this.router.navigate(['/workout-sessions/progress'], {
      queryParams: progressNavigationQuery(this.route.snapshot.queryParamMap),
    });
  }
}
