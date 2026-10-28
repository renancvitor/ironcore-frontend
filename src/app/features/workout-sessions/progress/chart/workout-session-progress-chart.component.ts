import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { ExerciseEvolutionPoint } from '../../workout-session-analytics.models';
import {
  AnalyticsIndicator,
  buildSessionProgressChart,
  formatAnalyticsValue,
} from '../workout-session-progress.utils';

@Component({
  selector: 'app-workout-session-progress-chart',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './workout-session-progress-chart.component.html',
  styleUrl: './workout-session-progress-chart.component.scss',
})
export class WorkoutSessionProgressChartComponent {
  readonly points = input.required<readonly ExerciseEvolutionPoint[]>();
  readonly indicator = input.required<AnalyticsIndicator>();
  readonly sessionOpened = output<number>();
  readonly chart = computed(() => buildSessionProgressChart(this.points(), this.indicator().key));
  readonly formatValue = formatAnalyticsValue;
}
