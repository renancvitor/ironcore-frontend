import { Component } from '@angular/core';
import { BodyMetricsLatestCardComponent } from './components/body-metrics-latest-card/body-metrics-latest-card.component';

@Component({
  selector: 'app-home',
  imports: [BodyMetricsLatestCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
