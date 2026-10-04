import { Component } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SummaryCardComponent } from '../summary-card/summary-card.component';

@Component({
  selector: 'app-in-progress-workouts-card',
  imports: [SummaryCardComponent, EmptyStateComponent],
  templateUrl: './in-progress-workouts-card.component.html',
  styleUrl: './in-progress-workouts-card.component.scss',
})
export class InProgressWorkoutsCardComponent {}
