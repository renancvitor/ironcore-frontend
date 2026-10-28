import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ExerciseEvolutionPoint } from '../../workout-session-analytics.models';
import {
  AnalyticsIndicator,
  buildSessionProgressChart,
  executionCoverage,
  formatAnalyticsValue,
} from '../workout-session-progress.utils';

@Component({
  selector: 'app-workout-session-progress-chart',
  imports: [DatePipe, DecimalPipe, ButtonComponent],
  templateUrl: './workout-session-progress-chart.component.html',
  styleUrl: './workout-session-progress-chart.component.scss',
})
export class WorkoutSessionProgressChartComponent {
  readonly points = input.required<readonly ExerciseEvolutionPoint[]>();
  readonly indicator = input.required<AnalyticsIndicator>();
  readonly sessionOpened = output<number>();
  readonly selectedId = signal<number | null>(null);
  readonly chart = computed(() => buildSessionProgressChart(this.points(), this.indicator().key));
  readonly selectedPoint = computed(
    () =>
      this.chart().points.find((point) => point.sessionId === this.selectedId()) ??
      this.chart().points.at(0),
  );
  readonly formatValue = formatAnalyticsValue;
  readonly coverage = executionCoverage;

  selectSession(event: Event): void {
    this.selectedId.set(Number((event.target as HTMLSelectElement).value));
  }
}
