import { Component, computed, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  BodyMetricsProgressChartResponse,
  BodyMetricsProgressMetric,
} from '../../body-metrics.models';
import { buildProgressChart } from '../body-metrics-progress-chart.utils';

@Component({
  selector: 'app-body-metrics-progress-chart',
  imports: [DecimalPipe],
  templateUrl: './body-metrics-progress-chart.component.html',
  styleUrl: './body-metrics-progress-chart.component.scss',
})
export class BodyMetricsProgressChartComponent {
  readonly data = input.required<BodyMetricsProgressChartResponse>();
  readonly title = input.required<string>();
  readonly chart = computed(() => buildProgressChart(this.data()));
  readonly hidden = signal<BodyMetricsProgressMetric[]>([]);
  readonly visible = computed(() =>
    this.chart().series.filter((series) => !this.hidden().includes(series.metric)),
  );
  readonly insufficient = computed(
    () => this.visible().length > 0 && this.visible().every((series) => !series.hasLine),
  );

  toggle(metric: BodyMetricsProgressMetric): void {
    this.hidden.update((hidden) =>
      hidden.includes(metric) ? hidden.filter((item) => item !== metric) : [...hidden, metric],
    );
  }
}
