import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BodyMetricsProgressChartComponent } from './body-metrics-progress-chart.component';
import {
  BodyMetricsProgressChartType as Type,
  BodyMetricsProgressMetric as Metric,
} from '../../body-metrics.models';

registerLocaleData(localePt);

describe('BodyMetricsProgressChartComponent', () => {
  it.each([
    [Type.BODY_COMPOSITION, Metric.WEIGHT_KG, 'Peso', 'kg'],
    [Type.CIRCUMFERENCES, Metric.WAIST_CM, 'Cintura', 'cm'],
    [Type.BODY_FAT, Metric.BODY_FAT_PERCENTAGE, 'Gordura corporal', '%'],
  ])(
    'renders exact backend values, labels and units for %s with an accessible table',
    (chartType, metric, label, unit) => {
      TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'pt-BR' }] });
      const fixture = TestBed.createComponent(BodyMetricsProgressChartComponent);
      fixture.componentRef.setInput('title', label);
      fixture.componentRef.setInput('data', {
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        chartType,
        series: [
          {
            metric,
            label,
            unit,
            points: [
              { period: '2026-03', value: 77.25 },
              { period: '2026-01', value: 79 },
            ],
          },
        ],
      });
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('svg[role="img"]')?.getAttribute('aria-label')).toContain(label);
      expect(element.querySelectorAll('circle')).toHaveLength(2);
      const rows = element.querySelectorAll('tbody tr');
      expect(rows[0].textContent).toContain('01/2026');
      expect(rows[1].textContent).toContain('03/2026');
      expect(rows[1].textContent).toContain(`77,25 ${unit}`);
      expect(rows[1].textContent).toContain(label);
      (element.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
      fixture.detectChanges();
      expect(element.querySelector('svg[role="img"]')).toBeNull();
      expect(element.textContent).toContain('Selecione pelo menos uma medida');
      expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    },
  );

  it('keeps an isolated point visible and explains insufficient evolution data', () => {
    const fixture = TestBed.createComponent(BodyMetricsProgressChartComponent);
    fixture.componentRef.setInput('title', 'Composição corporal');
    fixture.componentRef.setInput('data', {
      startDate: '2026-06-01',
      endDate: '2026-06-27',
      chartType: Type.BODY_COMPOSITION,
      series: [
        {
          metric: Metric.WEIGHT_KG,
          label: 'Peso',
          unit: 'kg',
          points: [{ period: '2026-06', value: 78 }],
        },
      ],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('circle')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Ainda não há dados suficientes');
  });

  it('connects June 12.41% to August 14.23% without inventing a July point, row or tooltip', () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'pt-BR' }] });
    const fixture = TestBed.createComponent(BodyMetricsProgressChartComponent);
    fixture.componentRef.setInput('title', 'Percentual de gordura');
    fixture.componentRef.setInput('data', {
      startDate: '2026-06-01',
      endDate: '2026-08-31',
      chartType: Type.BODY_FAT,
      series: [
        {
          metric: Metric.BODY_FAT_PERCENTAGE,
          label: 'Gordura corporal',
          unit: '%',
          points: [
            { period: '2026-08', value: 14.23 },
            { period: '2026-06', value: 12.41 },
          ],
        },
      ],
    });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.ic-chart__line')?.getAttribute('d')?.match(/[ML]/g)).toEqual([
      'M',
      'L',
    ]);
    expect(element.querySelectorAll('circle')).toHaveLength(2);
    const tooltips = [...element.querySelectorAll('circle title')].map(
      (title) => title.textContent,
    );
    expect(tooltips[0]).toContain('06/2026: 12,41');
    expect(tooltips[1]).toContain('08/2026: 14,23');
    expect(tooltips.join(' ')).not.toContain('07/2026');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(element.querySelector('tbody')?.textContent).not.toContain('07/2026');
    expect(element.querySelector('.ic-chart__plot')?.textContent).toContain('07/2026');
    expect(element.textContent).not.toContain('Ainda não há dados suficientes');
  });

  it.each([
    [Type.BODY_COMPOSITION, Metric.WEIGHT_KG, 'Peso', 'kg'],
    [Type.CIRCUMFERENCES, Metric.WAIST_CM, 'Cintura', 'cm'],
    [Type.BODY_FAT, Metric.BODY_FAT_PERCENTAGE, 'Gordura corporal', '%'],
  ])(
    'connects available evaluations across missing months with selectable lines and real tooltips for %s',
    (chartType, metric, label, unit) => {
      const fixture = TestBed.createComponent(BodyMetricsProgressChartComponent);
      fixture.componentRef.setInput('title', label);
      fixture.componentRef.setInput('data', {
        startDate: '2026-01-01',
        endDate: '2026-05-31',
        chartType,
        series: [
          {
            metric,
            label,
            unit,
            points: [
              { period: '2026-05', value: 16 },
              { period: '2026-02', value: 19 },
              { period: '2026-01', value: 20 },
              { period: '2026-04', value: 17 },
            ],
          },
        ],
      });
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const line = element.querySelector('.ic-chart__line')!;
      expect(line.getAttribute('d')?.match(/[ML]/g)).toEqual(['M', 'L', 'L', 'L']);
      expect(line.getAttribute('vector-effect')).toBe('non-scaling-stroke');
      expect(element.querySelectorAll('.ic-chart__plot circle')).toHaveLength(4);
      expect(element.querySelector('circle title')?.textContent).toContain('01/2026');
      expect(element.querySelector('circle title')?.textContent).toContain(label);
      expect(element.querySelector('circle title')?.textContent).toContain(unit);
      const checkbox = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
      checkbox.click();
      fixture.detectChanges();
      expect(element.querySelector('.ic-chart__line')).toBeNull();
      checkbox.click();
      fixture.detectChanges();
      expect(element.querySelector('.ic-chart__line')).toBeTruthy();
      expect(element.querySelectorAll('tbody tr')).toHaveLength(4);
    },
  );
});
