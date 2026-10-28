import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import { WorkoutSessionsService } from './workout-sessions.service';
import {
  cardioPoint,
  cardioResponse,
  strengthPoint,
  strengthResponse,
} from './progress/workout-session-progress.testing';

describe('Workout Session analytics HTTP contracts', () => {
  const base = 'https://api.ironcore.test/api/users/me/workout-sessions/analytics/exercises/50/';
  const period = { startDate: '2025-01-01', endDate: '2025-02-01' };
  let http: HttpTestingController;
  let service: WorkoutSessionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.ironcore.test' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(WorkoutSessionsService);
  });
  afterEach(() => http.verify());

  it('gets strength with only the required period and preserves nulls, zero and coverage', () => {
    const next = vi.fn();
    const response = strengthResponse([
      strengthPoint({ maxNormalizedLoadKg: null, volumeKgReps: null, volumeSetCount: 0 }),
      strengthPoint({ sessionId: 101, maxNormalizedLoadKg: 0, volumeKgReps: 0 }),
    ]);
    service.getStrengthEvolution(50, period).subscribe(next);
    const request = http.expectOne((req) => req.url === base + 'strength');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.toString()).toBe('startDate=2025-01-01&endDate=2025-02-01');
    request.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it('gets cardio and preserves independent measurements, averages and whole-period summary', () => {
    const next = vi.fn();
    const response = cardioResponse([
      cardioPoint({ distanceKm: null, averagePaceMinPerKm: null, averageSpeedKmPerHour: null }),
      cardioPoint({
        sessionId: 101,
        distanceKm: 0,
        averagePaceMinPerKm: null,
        averageSpeedKmPerHour: 0,
      }),
    ]);
    service.getCardioEvolution(50, period).subscribe(next);
    const request = http.expectOne((req) => req.url === base + 'cardio');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual(['startDate', 'endDate']);
    request.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  for (const family of ['strength', 'cardio'] as const) {
    it.each([400, 401, 403, 404, 422, 500])(
      `propagates ${family} HTTP %s without fabricating an empty response`,
      (status) => {
        const error = vi.fn();
        const result: Observable<unknown> =
          family === 'strength'
            ? service.getStrengthEvolution(50, period)
            : service.getCardioEvolution(50, period);
        result.subscribe({ error });
        http
          .expectOne((req) => req.url === base + family)
          .flush({ message: 'Falha' }, { status, statusText: 'Error' });
        expect(error).toHaveBeenCalledWith(expect.objectContaining({ status }));
        http.expectNone((req) => req.url === base + family);
      },
    );
  }
});
