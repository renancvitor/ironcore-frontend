import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import { WorkoutSessionsService } from './workout-sessions.service';
import { sessionDetail } from './workout-sessions.testing';
import { provideCoreHttp } from '../../core/http/http.providers';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { provideRouter, Router } from '@angular/router';

describe('WorkoutSessionsService', () => {
  const url = 'https://api.ironcore.test/api/users/me/workout-sessions';
  let service: WorkoutSessionsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: 'https://api.ironcore.test' },
    ] });
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
    const response = { id: 100, ...body, performedOn: sessionDetail.performedOn,
      startedAt: sessionDetail.startedAt, status: 'IN_PROGRESS', createdAt: sessionDetail.createdAt };
    request.flush(response, { status: 201, statusText: 'Created' });
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it.each(['in-progress', '100'])('gets the complete response from %s without planning queries', (path) => {
    const next = vi.fn();
    const operation = path === 'in-progress'
      ? service.getInProgressWorkoutSession() : service.getWorkoutSessionDetail(100);
    operation.subscribe(next);
    const request = http.expectOne(`${url}/${path}`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(sessionDetail);
    expect(next).toHaveBeenCalledExactlyOnceWith(sessionDetail);
  });

  it('maps only the expected missing open session to null', () => {
    const next = vi.fn();
    service.getInProgressWorkoutSession().subscribe(next);
    http.expectOne(`${url}/in-progress`).flush(
      { message: 'Sessão de treino em andamento não encontrada.' },
      { status: 404, statusText: 'Not Found' },
    );
    expect(next).toHaveBeenCalledExactlyOnceWith(null);
  });

  it.each([400, 401, 403, 404, 409, 500])('propagates real HTTP %s errors instead of returning empty', (status) => {
    const error = vi.fn();
    service.getInProgressWorkoutSession().subscribe({ error });
    http.expectOne(`${url}/in-progress`).flush({ message: 'Falha real' }, { status, statusText: 'Error' });
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ status }));
  });

  it.each(['MANUAL', 'AUTO_EXPIRED'] as const)('closes without client lifecycle fields and preserves %s', (closeReason) => {
    const next = vi.fn();
    service.closeWorkoutSession(100).subscribe(next);
    const request = http.expectOne(`${url}/100/close`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toBeNull();
    const response = { id: 100, performedOn: sessionDetail.performedOn,
      startedAt: sessionDetail.startedAt, finishedAt: '2026-10-28T06:00:00Z',
      status: 'CLOSED', closeReason, updatedAt: '2026-10-28T06:01:00Z' };
    request.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

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
    TestBed.configureTestingModule({ providers: [
      provideCoreHttp(), provideHttpClientTesting(), provideRouter([]),
      { provide: API_BASE_URL, useValue: '' },
    ] });
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

  it('preserves global 401 handling instead of treating authentication loss as absence', () => {
    const auth = TestBed.inject(AuthStateService);
    auth.setUser({ userId: 1, email: 'person@test.dev', nickname: 'Person', mustChangePassword: false });
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
