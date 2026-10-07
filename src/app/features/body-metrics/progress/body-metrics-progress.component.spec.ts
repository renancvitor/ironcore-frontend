import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { BodyMetricsProgressChartType as Type } from '../body-metrics.models';
import { BodyMetricsProgressComponent } from './body-metrics-progress.component';

describe('BodyMetricsProgressComponent', () => {
  let fixture: ComponentFixture<BodyMetricsProgressComponent>;
  let http: HttpTestingController;

  const base = '/api/users/me/body-metrics/progress/';
  const takeRequest = (path: string) => http.expectOne((request) => request.url === base + path);
  const flush = (request: TestRequest, series: unknown[] = []) =>
    request.flush({
      startDate: request.request.params.get('startDate'),
      endDate: request.request.params.get('endDate'),
      chartType: fixture.componentInstance.selected(),
      series,
    });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BodyMetricsProgressComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BodyMetricsProgressComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads only composition with the default dates and handles an empty response', () => {
    expect(fixture.nativeElement.querySelector('app-loading')).toBeTruthy();

    const request = takeRequest('body-composition');

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('startDate')).toBe(
      fixture.componentInstance.form.controls.startDate.value,
    );
    flush(request);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-empty-state')?.textContent).toContain(
      'Nenhuma medida disponível',
    );
    expect(fixture.nativeElement.querySelector('app-body-metrics-progress-chart')).toBeNull();
  });

  it('switches all three types from the visible controls without calling changes', () => {
    flush(takeRequest('body-composition'));
    fixture.detectChanges();

    const radios = fixture.nativeElement.querySelectorAll(
      'input[name="progress-type"]',
    ) as NodeListOf<HTMLInputElement>;

    radios[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selected()).toBe(Type.CIRCUMFERENCES);

    flush(takeRequest('circumferences'));
    radios[2].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selected()).toBe(Type.BODY_FAT);

    flush(takeRequest('body-fat'));
    radios[0].click();
    fixture.detectChanges();
    flush(takeRequest('body-composition'));

    http.expectNone((request) => request.url.endsWith('/changes'));
  });

  it('applies exact selected dates, clears old data and does not use unapplied edits when changing type', () => {
    flush(takeRequest('body-composition'));

    fixture.componentInstance.form.setValue({ startDate: '2025-01-01', endDate: '2025-03-31' });
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const request = takeRequest('body-composition');

    expect(request.request.params.get('startDate')).toBe('2025-01-01');
    expect(request.request.params.get('endDate')).toBe('2025-03-31');

    flush(request, [
      {
        metric: 'WEIGHT_KG',
        label: 'Peso',
        unit: 'kg',
        points: [{ period: '2025-01', value: 80 }],
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-body-metrics-progress-chart')).toBeTruthy();

    fixture.componentInstance.form.controls.startDate.setValue('');
    fixture.componentInstance.select(Type.BODY_FAT);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-body-metrics-progress-chart')).toBeNull();

    const next = takeRequest('body-fat');

    expect(next.request.params.get('startDate')).toBe('2025-01-01');
    flush(next);
  });

  it('rejects invalid periods without sending an HTTP request', () => {
    flush(takeRequest('body-composition'));

    fixture.componentInstance.form.setValue({ startDate: '2025-04-01', endDate: '2025-01-01' });
    fixture.componentInstance.applyPeriod();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#period-error').textContent).toContain('maior');
    http.expectNone((request) => request.url.startsWith(base));
  });

  it('cancels stale requests on selection and cancels pending work on destruction', () => {
    const first = takeRequest('body-composition');

    fixture.componentInstance.select(Type.BODY_FAT);

    expect(first.cancelled).toBe(true);
    expect(fixture.componentInstance.loading()).toBe(true);

    const second = takeRequest('body-fat');

    fixture.destroy();

    expect(second.cancelled).toBe(true);
  });

  it.each([null, { message: 'Período não permitido.' }])(
    'shows an error and retries the same query (%s)',
    (error) => {
      takeRequest('body-composition').flush(error, { status: 500, statusText: 'Error' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
      expect(
        fixture.nativeElement.querySelector('#progress-result [role="alert"]').textContent,
      ).toContain(error?.message ?? 'Não foi possível carregar');
      fixture.nativeElement.querySelector('#progress-result button').click();
      flush(takeRequest('body-composition'));
      fixture.detectChanges();
      expect(fixture.componentInstance.error()).toBe('');
    },
  );
});
