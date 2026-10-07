import { DatePipe, DecimalPipe, formatNumber } from '@angular/common';
import { Component, inject, input, LOCALE_ID } from '@angular/core';

import { BodyMetricsProgressChangesResponse } from '../../body-metrics.models';

@Component({
  selector: 'app-body-metrics-progress-changes',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './body-metrics-progress-changes.component.html',
  styleUrl: './body-metrics-progress-changes.component.scss',
})
export class BodyMetricsProgressChangesComponent {
  private readonly locale = inject(LOCALE_ID);

  readonly data = input.required<BodyMetricsProgressChangesResponse>();

  formatChange(value: number): string {
    const formattedValue = formatNumber(Math.abs(value), this.locale, '1.0-2');

    if (value > 0) {
      return `+${formattedValue}`;
    }

    if (value < 0) {
      return `-${formattedValue}`;
    }

    return formattedValue;
  }
}
