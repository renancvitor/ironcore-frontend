import { DatePipe, DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BodyMetricsLatestComponent } from '../../../body-metrics/latest/body-metrics-latest.component';
import { SummaryCardComponent } from '../summary-card/summary-card.component';

@Component({
  selector: 'app-body-metrics-latest-card',
  imports: [SummaryCardComponent, BodyMetricsLatestComponent, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './body-metrics-latest-card.component.html',
  styleUrl: './body-metrics-latest-card.component.scss',
})
export class BodyMetricsLatestCardComponent {}
