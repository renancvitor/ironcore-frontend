import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { finalize, Observable, Subscription } from 'rxjs';

import { BodyMetricsService } from '../body-metrics.service';
import {
  BodyMetricsProgressChangesResponse,
  BodyMetricsProgressChartResponse,
  BodyMetricsProgressChartType,
} from '../body-metrics.models';

import { ButtonComponent } from '../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

import { BodyMetricsProgressChartComponent } from './chart/body-metrics-progress-chart.component';
import { BodyMetricsProgressChangesComponent } from './changes/body-metrics-progress-changes.component';
import {
  defaultProgressPeriod,
  localDateString,
  progressPeriodError,
} from './body-metrics-progress-chart.utils';

type BodyMetricsProgressView = BodyMetricsProgressChartType | 'CHANGES';

@Component({
  selector: 'app-body-metrics-progress',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    ButtonComponent,
    LoadingComponent,
    EmptyStateComponent,
    BodyMetricsProgressChartComponent,
    BodyMetricsProgressChangesComponent,
  ],
  templateUrl: './body-metrics-progress.component.html',
  styleUrl: './body-metrics-progress.component.scss',
})
export class BodyMetricsProgressComponent implements OnInit {
  private readonly bodyMetricsService = inject(BodyMetricsService);
  private readonly router = inject(Router);

  private request?: Subscription;
  private period = defaultProgressPeriod();

  readonly options: { type: BodyMetricsProgressView; label: string }[] = [
    {
      type: BodyMetricsProgressChartType.BODY_COMPOSITION,
      label: 'Composição corporal',
    },
    {
      type: BodyMetricsProgressChartType.CIRCUMFERENCES,
      label: 'Circunferências',
    },
    {
      type: BodyMetricsProgressChartType.BODY_FAT,
      label: 'Percentual de gordura',
    },
    {
      type: 'CHANGES',
      label: 'Comparativo',
    },
  ];

  readonly selected = signal<BodyMetricsProgressView>(
    BodyMetricsProgressChartType.BODY_COMPOSITION,
  );
  readonly response = signal<BodyMetricsProgressChartResponse | null>(null);
  readonly changesResponse = signal<BodyMetricsProgressChangesResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly validationError = signal('');

  readonly form = new FormGroup({
    startDate: new FormControl(this.period.startDate, { nonNullable: true }),
    endDate: new FormControl(this.period.endDate, { nonNullable: true }),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  get today(): string {
    return localDateString(new Date());
  }

  get selectedLabel(): string {
    return this.options.find((option) => option.type === this.selected())!.label;
  }

  get hasData(): boolean {
    return this.response()?.series.some((series) => series.points.length > 0) ?? false;
  }

  ngOnInit(): void {
    this.loadProgress();
  }

  select(type: BodyMetricsProgressView): void {
    if (type === this.selected()) {
      return;
    }

    this.selected.set(type);

    this.loadProgress();
  }

  applyPeriod(): void {
    const period = this.form.getRawValue();
    const error = progressPeriodError(period);

    this.validationError.set(error);

    if (error) {
      return;
    }

    this.period = period;

    this.loadProgress();
  }

  backToHistory(): void {
    void this.router.navigate(['/body-metrics']);
  }

  retry(): void {
    this.loadProgress();
  }

  private loadProgress(): void {
    this.request?.unsubscribe();

    this.response.set(null);
    this.changesResponse.set(null);
    this.error.set('');
    this.loading.set(true);

    const request = this.getProgressRequest();

    this.request = request
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          if ('changes' in response) {
            this.changesResponse.set(response);
            return;
          }

          this.response.set(response);
        },

        error: (error) => {
          this.error.set(
            error.error?.message ||
              'Não foi possível carregar a evolução corporal. Tente novamente.',
          );
        },
      });
  }

  private getProgressRequest(): Observable<
    BodyMetricsProgressChartResponse | BodyMetricsProgressChangesResponse
  > {
    if (this.selected() === 'CHANGES') {
      return this.bodyMetricsService.getChanges(this.period);
    }

    if (this.selected() === BodyMetricsProgressChartType.BODY_COMPOSITION) {
      return this.bodyMetricsService.getBodyComposition(this.period);
    }

    if (this.selected() === BodyMetricsProgressChartType.CIRCUMFERENCES) {
      return this.bodyMetricsService.getCircumferences(this.period);
    }

    return this.bodyMetricsService.getBodyFat(this.period);
  }
}
