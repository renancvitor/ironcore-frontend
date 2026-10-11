import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import {
  BodyMetricsProgressChangesResponse,
  BodyMetricsProgressMetric,
} from '../../../body-metrics/body-metrics.models';
import { BodyMetricsService } from '../../../body-metrics/body-metrics.service';
import { defaultProgressPeriod } from '../../../body-metrics/progress/body-metrics-progress-chart.utils';
import { SummaryCardComponent } from '../summary-card/summary-card.component';

@Component({
  selector: 'app-body-metrics-progress-card',
  imports: [
    SummaryCardComponent,
    EmptyStateComponent,
    LoadingComponent,
    ButtonComponent,
    DatePipe,
    DecimalPipe,
    RouterLink,
  ],
  templateUrl: './body-metrics-progress-card.component.html',
  styleUrl: './body-metrics-progress-card.component.scss',
})
export class BodyMetricsProgressCardComponent implements OnInit {
  private readonly service = inject(BodyMetricsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly summaryMetrics = [
    BodyMetricsProgressMetric.WEIGHT_KG,
    BodyMetricsProgressMetric.BODY_FAT_PERCENTAGE,
    BodyMetricsProgressMetric.FAT_MASS_KG,
    BodyMetricsProgressMetric.LEAN_MASS_KG,
  ];

  readonly period = defaultProgressPeriod();
  readonly response = signal<BodyMetricsProgressChangesResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly changes = computed(() =>
    this.summaryMetrics.flatMap(
      (metric) => this.response()?.changes.filter((change) => change.metric === metric) ?? [],
    ),
  );

  ngOnInit(): void {
    this.loadProgress();
  }

  loadProgress(): void {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(false);
    this.response.set(null);
    this.service
      .getChanges(this.period)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => this.response.set(response),
        error: () => this.error.set(true),
      });
  }
}
