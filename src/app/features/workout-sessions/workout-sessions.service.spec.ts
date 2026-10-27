import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import { provideCoreHttp } from '../../core/http/http.providers';
import { WorkoutSessionsService } from './workout-sessions.service';
import { sessionDetail, sessionSet } from './workout-sessions.testing';

describe('WorkoutSessionsService', () => {
  const url = 'https://api.ironcore.test/api/users/me/workout-sessions';
  let service: WorkoutSessionsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.ironcore.test' },
      ],
    });
    service = TestBed.inject(WorkoutSessionsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('starts with only the selected cycle and day IDs and preserves the response', () => {
    const next = vi.fn();
    const body = { workoutCycleId: 9, workoutDayId: 30 };
    service.startWorkoutSession(body).subscribe(next);
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    const response = {
      id: 100,
      ...body,
      performedOn: sessionDetail.performedOn,
      startedAt: sessionDetail.startedAt,
      status: 'IN_PROGRESS',
      createdAt: sessionDetail.createdAt,
    };
    request.flush(response, { status: 201, statusText: 'Created' });
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it.each(['in-progress', '100'])(
    'gets the complete response from %s without planning queries',
    (path) => {
      const next = vi.fn();
      const operation =
        path === 'in-progress'
          ? service.getInProgressWorkoutSession()
          : service.getWorkoutSessionDetail(100);
      operation.subscribe(next);
      const request = http.expectOne(`${url}/${path}`);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys()).toEqual([]);
      request.flush(sessionDetail);
      expect(next).toHaveBeenCalledExactlyOnceWith(sessionDetail);
    },
  );

  it('maps only the expected missing open session to null', () => {
    const next = vi.fn();
    service.getInProgressWorkoutSession().subscribe(next);
    http.expectOne(`${url}/in-progress`).flush(
      { message: 'Sessão de treino em andamento não encontrada.' },
      { status: 404, statusText: 'Not Found' },
    );
    expect(next).toHaveBeenCalledExactlyOnceWith(null);
  });

  it.each([400, 401, 403, 404, 409, 500])(
    'propagates real HTTP %s errors instead of returning empty',
    (status) => {
      const error = vi.fn();
      service.getInProgressWorkoutSession().subscribe({ error });
      http
        .expectOne(`${url}/in-progress`)
        .flush({ message: 'Falha real' }, { status, statusText: 'Error' });
      expect(error).toHaveBeenCalledWith(expect.objectContaining({ status }));
    },
  );

  it.each(['MANUAL', 'AUTO_EXPIRED'] as const)(
    'closes without client lifecycle fields and preserves %s',
    (closeReason) => {
      const next = vi.fn();
      service.closeWorkoutSession(100).subscribe(next);
      const request = http.expectOne(`${url}/100/close`);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toBeNull();
      const response = {
        id: 100,
        performedOn: sessionDetail.performedOn,
        startedAt: sessionDetail.startedAt,
        finishedAt: '2026-10-28T06:00:00Z',
        status: 'CLOSED',
        closeReason,
        updatedAt: '2026-10-28T06:01:00Z',
      };
      request.flush(response);
      expect(next).toHaveBeenCalledExactlyOnceWith(response);
    },
  );

  it.each([400, 401, 403, 404, 409, 500])('propagates HTTP %s from mutations', (status) => {
    const error = vi.fn();
    service.startWorkoutSession({ workoutCycleId: 9, workoutDayId: 30 }).subscribe({ error });
    http.expectOne(url).flush({}, { status, statusText: 'Error' });
    service.closeWorkoutSession(100).subscribe({ error });
    http.expectOne(`${url}/100/close`).flush({}, { status, statusText: 'Error' });
    expect(error).toHaveBeenCalledTimes(2);
  });
});

describe('WorkoutSessionsService with the existing authentication and CSRF interceptors', () => {
  let http: HttpTestingController;
  let service: WorkoutSessionsService;
  const url = '/api/users/me/workout-sessions';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideCoreHttp(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(WorkoutSessionsService);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => http.verify());

  it('uses the configured cookies and CSRF flow for start and close', () => {
    service.startWorkoutSession({ workoutCycleId: 9, workoutDayId: 30 }).subscribe();
    http.expectOne('/api/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'start-token' });
    const start = http.expectOne(url);
    expect(start.request.withCredentials).toBe(true);
    expect(start.request.headers.get('X-CSRF-TOKEN')).toBe('start-token');
    start.flush({ id: 100 });
    service.closeWorkoutSession(100).subscribe();
    http.expectOne('/api/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'close-token' });
    const close = http.expectOne(`${url}/100/close`);
    expect(close.request.withCredentials).toBe(true);
    expect(close.request.headers.get('X-CSRF-TOKEN')).toBe('close-token');
    expect(close.request.body).toBeNull();
    close.flush({ id: 100, status: 'CLOSED', closeReason: 'MANUAL' });
  });

  it('preserves cookies and CSRF for every new execution mutation', () => {
    const requests = [
      () => service.updateWorkoutSessionNotes(100, { notes: null }),
      () => service.updateWorkoutSessionActivityExecution(100, 200, { actualDistanceKm: 0 }),
      () => service.createWorkoutSessionSet(100, 200, { setNumber: 1, notes: 'Relato' }),
      () => service.updateWorkoutSessionSet(100, 200, 300, { actualReps: null }),
      () => service.deleteWorkoutSessionSet(100, 200, 300),
      () => service.changeWorkoutSessionActivityLoadMode(100, 200, { actualLoadMode: 'TOTAL' }),
    ];
    for (const request of requests) {
      request().subscribe();
      http.expectOne('/api/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'execution-token' });
      const mutation = http.expectOne((req) => req.url.startsWith(`${url}/100/`));
      expect(mutation.request.withCredentials).toBe(true);
      expect(mutation.request.headers.get('X-CSRF-TOKEN')).toBe('execution-token');
      mutation.flush(mutation.request.method === 'DELETE' ? null : {});
    }
  });

  it('preserves global 401 handling instead of treating authentication loss as absence', () => {
    const auth = TestBed.inject(AuthStateService);
    auth.setUser({
      userId: 1,
      email: 'person@test.dev',
      nickname: 'Person',
      mustChangePassword: false,
    });
    const error = vi.fn();
    service.getInProgressWorkoutSession().subscribe({ error });
    const request = http.expectOne(`${url}/in-progress`);
    expect(request.request.withCredentials).toBe(true);
    request.flush({ message: 'Não autenticado' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login']);
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('does not send a mutation after a forbidden CSRF response', () => {
    const error = vi.fn();
    service.closeWorkoutSession(100).subscribe({ error });
    http.expectOne('/api/auth/csrf').flush({}, { status: 403, statusText: 'Forbidden' });
    http.expectNone(`${url}/100/close`);
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });
});

describe('WorkoutSessionsService execution REST contracts', () => {
  let http: HttpTestingController;
  let service: WorkoutSessionsService;
  const url = '/api/users/me/workout-sessions/100';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: '' }] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(WorkoutSessionsService);
  });
  afterEach(() => http.verify());

  it('PATCHes only the supplied fields, preserves explicit null and returns full session notes response', () => {
    const next = vi.fn();
    service.updateWorkoutSessionNotes(100, { notes: null }).subscribe(next);
    const request = http.expectOne(`${url}/notes`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ notes: null });
    request.flush(sessionDetail);
    expect(next).toHaveBeenCalledExactlyOnceWith(sessionDetail);
  });

  it('returns real activity details from execution and collective mode endpoints', () => {
    const next = vi.fn();
    service.updateWorkoutSessionActivityExecution(100, 200, { actualDurationMinutes: null }).subscribe(next);
    const execution = http.expectOne(`${url}/activities/200/execution`);
    expect(execution.request.method).toBe('PATCH');
    expect(execution.request.body).toEqual({ actualDurationMinutes: null });
    execution.flush(sessionDetail.activities[0]);
    const activity = { ...sessionDetail.activities[0], actualLoadMode: 'PER_SIDE' };
    service.changeWorkoutSessionActivityLoadMode(100, 200, { actualLoadMode: 'PER_SIDE' }).subscribe(next);
    const mode = http.expectOne(`${url}/activities/200/load-mode`);
    expect(mode.request.method).toBe('PATCH');
    expect(mode.request.body).toEqual({ actualLoadMode: 'PER_SIDE' });
    mode.flush(activity);
    expect(next).toHaveBeenNthCalledWith(1, sessionDetail.activities[0]);
    expect(next).toHaveBeenNthCalledWith(2, activity);
  });

  it('POSTs partial execution and returns the set ID and backend normalized load unchanged', () => {
    const next = vi.fn();
    const body = { setNumber: 1, actualLoadKg: 10, actualLoadMode: 'PER_SIDE' as const };
    service.createWorkoutSessionSet(100, 200, body).subscribe(next);
    const request = http.expectOne(`${url}/activities/200/sets`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    const response = sessionSet({ id: 987, actualLoadKg: 10, actualLoadMode: 'PER_SIDE', actualReps: null, normalizedLoadKg: 20 });
    request.flush(response, { status: 201, statusText: 'Created' });
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it('PATCHes a set by its historical ID without injecting omitted fields', () => {
    const next = vi.fn();
    service.updateWorkoutSessionSet(100, 200, 987, { notes: null }).subscribe(next);
    const request = http.expectOne(`${url}/activities/200/sets/987`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ notes: null });
    request.flush(sessionSet({ id: 987 }));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ id: 987 }));
  });

  it('DELETEs a persisted set and accepts 204 without assuming a response object', () => {
    const next = vi.fn();
    service.deleteWorkoutSessionSet(100, 200, 987).subscribe(next);
    const request = http.expectOne(`${url}/activities/200/sets/987`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([400, 401, 403, 404, 409, 500, 0])('propagates HTTP %s without retrying a creation', (status) => {
    const error = vi.fn();
    service.createWorkoutSessionSet(100, 200, { setNumber: 1, actualReps: 8 }).subscribe({ error });
    const request = http.expectOne(`${url}/activities/200/sets`);
    if (status === 0) request.error(new ProgressEvent('error'));
    else request.flush({ message: 'Falha' }, { status, statusText: 'Error' });
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ status }));
    http.expectNone(() => true);
  });
});
