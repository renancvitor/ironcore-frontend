import { Component } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SummaryCardComponent } from '../summary-card/summary-card.component';

@Component({
  selector: 'app-body-metrics-progress-card',
  imports: [SummaryCardComponent, EmptyStateComponent],
  templateUrl: './body-metrics-progress-card.component.html',
  styleUrl: './body-metrics-progress-card.component.scss',
})
export class BodyMetricsProgressCardComponent {}
