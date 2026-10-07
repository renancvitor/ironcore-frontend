import { DecimalPipe } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';

import {
  BodyMetricsProgressChartResponse,
  BodyMetricsProgressMetric,
} from '../../body-metrics.models';

import { buildProgressChart, monthLabel } from '../body-metrics-progress-chart.utils';

@Component({
  selector: 'app-body-metrics-progress-chart',
  imports: [DecimalPipe],
  templateUrl: './body-metrics-progress-chart.component.html',
  styleUrl: './body-metrics-progress-chart.component.scss',
})
export class BodyMetricsProgressChartComponent {
  readonly data = input.required<BodyMetricsProgressChartResponse>();
  readonly title = input.required<string>();

  readonly hidden = signal<BodyMetricsProgressMetric[]>([]);

  readonly chart = computed(() => buildProgressChart(this.data()));

  readonly visible = computed(() =>
    this.chart().series.filter((series) => !this.hidden().includes(series.metric)),
  );

  readonly insufficient = computed(
    () => this.visible().length > 0 && this.visible().every((series) => !series.hasLine),
  );

  readonly tableMonths = computed(() => {
    const periods = this.chart().series.flatMap((series) =>
      series.points.map((point) => point.period),
    );

    return [...new Set(periods)]
      .sort((first, second) => first.localeCompare(second))
      .map((period) => ({
        period,
        label: monthLabel(period),
      }));
  });

  readonly tableRows = computed(() =>
    this.chart().series.map((series) => ({
      metric: series.metric,
      label: series.label,
      unit: series.unit,
      values: new Map(series.points.map((point) => [point.period, point.value])),
    })),
  );

  toggle(metric: BodyMetricsProgressMetric): void {
    this.hidden.update((hidden) => {
      if (hidden.includes(metric)) {
        return hidden.filter((item) => item !== metric);
      }

      return [...hidden, metric];
    });
  }
}
