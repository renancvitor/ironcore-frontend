import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  BodyMetricsProgressChangesResponse,
  BodyMetricsProgressMetric,
} from '../../body-metrics.models';
import { BodyMetricsProgressChangesComponent } from './body-metrics-progress-changes.component';

registerLocaleData(localePt);

describe('BodyMetricsProgressChangesComponent', () => {
  let fixture: ComponentFixture<BodyMetricsProgressChangesComponent>;

  const response: BodyMetricsProgressChangesResponse = {
    startDate: '2025-01-01',
    endDate: '2025-03-31',
    changes: [
      {
        metric: BodyMetricsProgressMetric.WEIGHT_KG,
        label: 'Peso',
        unit: 'kg',
        firstDate: '2025-01-05',
        firstValue: 65,
        lastDate: '2025-03-20',
        lastValue: 66,
        absoluteChange: 1,
        percentageChange: 1.538461538,
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BodyMetricsProgressChangesComponent],
      providers: [{ provide: LOCALE_ID, useValue: 'pt-BR' }],
    });

    fixture = TestBed.createComponent(BodyMetricsProgressChangesComponent);
    fixture.componentRef.setInput('data', response);
  });

  it('renders a horizontal comparison with reference dates and an accessible scroll region', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const headers = Array.from(element.querySelectorAll('thead th'));
    const cells = Array.from(element.querySelectorAll('tbody td'));
    const dates = Array.from(element.querySelectorAll('time'));

    expect(headers.map((header) => header.textContent?.trim())).toEqual([
      'Medida',
      'Inicial',
      'Final',
      'Diferença',
      'Variação',
    ]);
    expect(element.querySelector('th[scope="row"]')?.textContent).toBe('Peso');
    expect(cells[0].textContent).toContain('65 kg');
    expect(cells[1].textContent).toContain('66 kg');
    expect(cells[2].textContent?.trim()).toBe('+1 kg');
    expect(cells[3].textContent?.trim()).toBe('+1,54%');
    expect(dates.map((date) => date.textContent?.trim())).toEqual(['05/01/2025', '20/03/2025']);
    expect(dates.map((date) => date.getAttribute('datetime'))).toEqual([
      '2025-01-05',
      '2025-03-20',
    ]);
    expect(element.querySelector('[role="region"][tabindex="0"]')).toBeTruthy();
    expect(element.querySelectorAll('thead th[scope="col"]')).toHaveLength(5);
  });

  it.each([
    [BodyMetricsProgressMetric.CALF_CM, 'cm', -1, -2.777777, '-1 cm', '-2,78%'],
    [BodyMetricsProgressMetric.LEAN_MASS_KG, 'kg', 0, 0, '0 kg', '0%'],
    [BodyMetricsProgressMetric.BODY_FAT_PERCENTAGE, '%', 1.82, 14.665592, '+1,82 %', '+14,67%'],
    [BodyMetricsProgressMetric.BMI, '', -1, -4, '-1', '-4%'],
  ])(
    'preserves backend differences and units for %s without recalculating',
    (metric, unit, absoluteChange, percentageChange, expectedDifference, expectedPercentage) => {
      fixture.componentRef.setInput('data', {
        ...response,
        changes: [{ ...response.changes[0], metric, unit, absoluteChange, percentageChange }],
      });
      fixture.detectChanges();

      const cells = fixture.nativeElement.querySelectorAll('tbody td') as NodeListOf<HTMLElement>;

      expect(cells[2].textContent?.trim()).toBe(expectedDifference);
      expect(cells[3].textContent?.trim()).toBe(expectedPercentage);
    },
  );

  it('keeps each measure’s own dates, including two evaluations on the same day', () => {
    fixture.componentRef.setInput('data', {
      ...response,
      changes: [
        response.changes[0],
        {
          ...response.changes[0],
          metric: BodyMetricsProgressMetric.CHEST_CM,
          label: 'Peitoral',
          unit: 'cm',
          firstDate: '2025-02-15',
          lastDate: '2025-02-15',
        },
      ],
    });
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>;

    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('05/01/2025');
    expect(rows[1].querySelectorAll('time')[0].textContent?.trim()).toBe('15/02/2025');
    expect(rows[1].querySelectorAll('time')[1].textContent?.trim()).toBe('15/02/2025');
  });

  it.each([
    [0.001, '+0'],
    [-0.001, '-0'],
    [0, '0'],
  ])('preserves the sign when formatting %s to two decimal places', (value, expected) => {
    expect(fixture.componentInstance.formatChange(value)).toBe(expected);
  });
});
