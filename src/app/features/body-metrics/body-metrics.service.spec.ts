import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/http/api-base-url.token';
import {
  BodyMetricsProgressChartType,
  BodyMetricsProgressMetric,
  CreateBodyMetricsRequest,
  UpdateBodyMetricsRequest,
} from './body-metrics.models';

import { BodyMetricsService } from './body-metrics.service';

describe('BodyMetricsService', () => {
  const apiBaseUrl = 'https://api.ironcore.test';
  const baseUrl = `${apiBaseUrl}/api/users/me/body-metrics`;

  let service: BodyMetricsService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    });

    service = TestBed.inject(BodyMetricsService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create body metrics', () => {
    const body: CreateBodyMetricsRequest = {
      weightKg: 80,
      heightCm: 180,
      circumferences: null,
      notes: 'Initial measurement',
    };

    service.create(body).subscribe();

    const request = httpTestingController.expectOne(baseUrl);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ id: 1 });
  });

  it('should update body metrics by id', () => {
    const body: UpdateBodyMetricsRequest = {
      weightKg: 78,
      heightCm: 180,
      circumferences: null,
      notes: null,
    };

    service.update(10, body).subscribe();

    const request = httpTestingController.expectOne(`${baseUrl}/10`);

    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({ id: 10 });
  });

  it('should delete body metrics by id', () => {
    service.delete(10).subscribe();

    const request = httpTestingController.expectOne(`${baseUrl}/10`);

    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('should list body metrics with the supplied pagination', () => {
    service.list(2, 50).subscribe();

    const request = httpTestingController.expectOne(
      (httpRequest) =>
        httpRequest.url === baseUrl &&
        httpRequest.params.get('page') === '2' &&
        httpRequest.params.get('size') === '50',
    );

    expect(request.request.method).toBe('GET');
    request.flush({
      metrics: { content: [], page: 2, size: 50, totalElements: 0, totalPages: 0, last: true },
    });
  });

  it('should list body metrics with the default pagination', () => {
    service.list().subscribe();

    const request = httpTestingController.expectOne(
      (httpRequest) =>
        httpRequest.url === baseUrl &&
        httpRequest.params.get('page') === '0' &&
        httpRequest.params.get('size') === '20',
    );

    expect(request.request.method).toBe('GET');
    request.flush({
      metrics: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true },
    });
  });

  it('should get body metrics by id', () => {
    service.getById(10).subscribe();

    const request = httpTestingController.expectOne(`${baseUrl}/10`);

    expect(request.request.method).toBe('GET');
    request.flush({ id: 10 });
  });

  it('should get the latest body metrics', () => {
    service.getLatest().subscribe();

    const request = httpTestingController.expectOne(`${baseUrl}/latest`);

    expect(request.request.method).toBe('GET');
    request.flush({ id: 10 });
  });

  it.each([
    ['body composition', 'getBodyComposition', '/progress/body-composition'],
    ['circumferences', 'getCircumferences', '/progress/circumferences'],
    ['body fat', 'getBodyFat', '/progress/body-fat'],
  ] as const)('should get %s progress with the selected date range', (_label, method, path) => {
    const dates = { startDate: '2026-01-01', endDate: '2026-01-31' };

    service[method](dates).subscribe();

    const request = httpTestingController.expectOne(
      (httpRequest) =>
        httpRequest.url === `${baseUrl}${path}` &&
        httpRequest.params.get('startDate') === dates.startDate &&
        httpRequest.params.get('endDate') === dates.endDate,
    );

    expect(request.request.method).toBe('GET');
    request.flush({
      startDate: dates.startDate,
      endDate: dates.endDate,
      chartType: BodyMetricsProgressChartType.BODY_COMPOSITION,
      series: [],
    });
  });

  it('should get progress changes with the selected date range', () => {
    const dates = { startDate: '2026-01-01', endDate: '2026-01-31' };

    service.getChanges(dates).subscribe();

    const request = httpTestingController.expectOne(
      (httpRequest) =>
        httpRequest.url === `${baseUrl}/progress/changes` &&
        httpRequest.params.get('startDate') === dates.startDate &&
        httpRequest.params.get('endDate') === dates.endDate,
    );

    expect(request.request.method).toBe('GET');
    request.flush({
      startDate: dates.startDate,
      endDate: dates.endDate,
      changes: [
        {
          metric: BodyMetricsProgressMetric.WEIGHT_KG,
          label: 'Weight',
          unit: 'kg',
          firstDate: dates.startDate,
          firstValue: 80,
          lastDate: dates.endDate,
          lastValue: 78,
          absoluteChange: -2,
          percentageChange: -2.5,
        },
      ],
    });
  });
});
