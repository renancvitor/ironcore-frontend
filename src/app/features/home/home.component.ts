import { Component } from '@angular/core';
import { BodyMetricsLatestCardComponent } from './components/body-metrics-latest-card/body-metrics-latest-card.component';
import { InProgressWorkoutsCardComponent } from './components/in-progress-workouts-card/in-progress-workouts-card.component';
import { BodyMetricsProgressCardComponent } from './components/body-metrics-progress-card/body-metrics-progress-card.component';

@Component({
  selector: 'app-home',
  imports: [
    BodyMetricsLatestCardComponent,
    InProgressWorkoutsCardComponent,
    BodyMetricsProgressCardComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
