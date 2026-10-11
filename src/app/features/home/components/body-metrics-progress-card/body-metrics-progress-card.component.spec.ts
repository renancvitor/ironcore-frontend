import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../../../core/http/api-base-url.token';
import {
  BodyMetricsProgressChangesResponse,
  BodyMetricsProgressMetric as Metric,
} from '../../../body-metrics/body-metrics.models';
import { BodyMetricsProgressCardComponent } from './body-metrics-progress-card.component';

registerLocaleData(localePt);

describe('BodyMetricsProgressCardComponent', () => {
  let fixture: ComponentFixture<BodyMetricsProgressCardComponent>;
  let http: HttpTestingController;
  const endpoint = '/api/users/me/body-metrics/progress/changes';
  const weight: BodyMetricsProgressChangesResponse['changes'][number] = {
    metric: Metric.WEIGHT_KG,
    label: 'Peso',
    unit: 'kg',
    firstDate: '2026-05-02',
    lastDate: '2026-10-10',
    firstValue: 80,
    lastValue: 78,
    // Deliberately different from a frontend calculation: the API is authoritative.
    absoluteChange: -1.23,
    percentageChange: -9.87,
  };
  const response = (changes = [weight]): BodyMetricsProgressChangesResponse => ({
    startDate: '2026-05-01',
    endDate: '2026-10-11',
    changes,
  });
  const request = () => http.expectOne((req) => req.url === endpoint);
  const content = () => (fixture.nativeElement as HTMLElement).textContent!;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 11, 12));
    await TestBed.configureTestingModule({
      imports: [BodyMetricsProgressCardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '' },
        { provide: LOCALE_ID, useValue: 'pt-BR' },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BodyMetricsProgressCardComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('loads one comparison for the shared default period and prevents duplicate requests', () => {
    const pending = request();
    expect(pending.request.method).toBe('GET');
    expect(pending.request.params.keys().sort()).toEqual(['endDate', 'startDate']);
    expect(pending.request.params.get('startDate')).toBe('2026-05-01');
    expect(pending.request.params.get('endDate')).toBe('2026-10-11');
    expect(content()).toContain('01/05/2026 a 11/10/2026');
    expect(fixture.nativeElement.querySelectorAll('app-loading')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeTruthy();
    fixture.componentInstance.loadProgress();
    http.expectNone((req) => req.url === endpoint);
    pending.flush(response());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-busy="false"]')).toBeTruthy();
  });

  it('shows only summary measures, API deltas, individual dates, units and neutral signs', () => {
    request().flush(
      response([
        { ...weight, metric: Metric.BMI, label: 'IMC' },
        {
          ...weight,
          metric: Metric.LEAN_MASS_KG,
          label: 'Massa magra',
          absoluteChange: 0,
          percentageChange: 0,
        },
        { ...weight, metric: Metric.WAIST_CM, label: 'Cintura', unit: 'cm' },
        {
          ...weight,
          metric: Metric.BODY_FAT_PERCENTAGE,
          label: 'Percentual de gordura',
          unit: '%',
          firstDate: '2026-06-03',
          absoluteChange: 1.2,
          percentageChange: 6.78,
        },
        weight,
        {
          ...weight,
          metric: Metric.FAT_MASS_KG,
          label: 'Massa gorda',
          absoluteChange: 0.42,
          percentageChange: 2.1,
        },
      ]),
    );
    fixture.detectChanges();
    expect(
      Array.from(
        fixture.nativeElement.querySelectorAll('dt') as NodeListOf<HTMLElement>,
        (el) => el.textContent,
      ),
    ).toEqual(['Peso', 'Percentual de gordura', 'Massa gorda', 'Massa magra']);
    for (const value of [
      '-1,23 kg',
      '-9,87%',
      '+1,2 p.p.',
      '+6,78%',
      '+0,42 kg',
      '0 kg',
      '0%',
      '02/05/2026',
      '03/06/2026',
      '10/10/2026',
    ]) {
      expect(content()).toContain(value);
    }
    for (const value of ['IMC', 'Cintura', 'melhora', 'piora', 'NaN', 'undefined']) {
      expect(content()).not.toContain(value);
    }
    expect(
      fixture.nativeElement.querySelector('svg, table, app-body-metrics-progress-chart'),
    ).toBeNull();
    expect(fixture.nativeElement.querySelector('time')?.getAttribute('datetime')).toBe(
      weight.firstDate,
    );
  });

  it('renders a partial summary without inventing missing measures', () => {
    request().flush(response());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('dt')).toHaveLength(1);
    expect(content()).not.toContain('Massa magra');
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
  });

  it.each([
    { changes: [] },
    { changes: [{ ...weight, metric: Metric.WAIST_CM, label: 'Cintura' }] },
  ])('handles insufficient summary data (%j)', ({ changes }) => {
    request().flush(response(changes));
    fixture.detectChanges();
    expect(content()).toContain('Sem dados suficientes para este resumo no período.');
    expect(fixture.nativeElement.querySelector('dl, app-loading, [role="alert"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('footer a')?.getAttribute('href')).toBe(
      '/body-metrics/progress?from=home',
    );
  });

  it.each([0, 404, 500])(
    'shows an inline error and retries successfully for status %s',
    (status) => {
      request().flush(null, { status, statusText: 'Error' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
        'Não foi possível carregar',
      );
      expect(fixture.nativeElement.querySelector('app-empty-state, app-loading')).toBeNull();
      fixture.nativeElement.querySelector('button').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-loading')).toBeTruthy();
      request().flush(response());
      fixture.detectChanges();
      expect(content()).toContain('-1,23 kg');
      expect(fixture.nativeElement.querySelector('button, app-loading')).toBeNull();
    },
  );

  it('keeps the full progress navigation available while loading and after success', () => {
    const link = fixture.nativeElement.querySelector('footer a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/body-metrics/progress?from=home');
    request().flush(response());
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    link.click();
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('cancels the pending request when the Home card is destroyed', () => {
    const pending = request();
    fixture.destroy();
    expect(pending.cancelled).toBe(true);
  });
});
