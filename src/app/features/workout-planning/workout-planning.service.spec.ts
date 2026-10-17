import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/http/api-base-url.token';
import {
  CancelWorkoutCycleResponse,
  CompleteWorkoutCycleResponse,
  CreateWorkoutActivityRequest,
  CreateWorkoutActivityResponse,
  CreateWorkoutCycleRequest,
  CreateWorkoutCycleResponse,
  CreateWorkoutDayRequest,
  CreateWorkoutDayResponse,
  GetWorkoutCycleDetailResponse,
  ListWorkoutCyclesRequest,
  ListWorkoutCyclesResponse,
  StartWorkoutCycleResponse,
  TrainingGoalResponse,
  UpdateWorkoutActivityRequest,
  UpdateWorkoutActivityResponse,
  UpdateWorkoutCycleRequest,
  UpdateWorkoutCycleResponse,
  UpdateWorkoutDayResponse,
  WeekDay,
} from './workout-planning.models';
import { WorkoutPlanningService } from './workout-planning.service';

describe('WorkoutPlanningService', () => {
  const apiBaseUrl = 'https://api.ironcore.test';
  const cyclesUrl = `${apiBaseUrl}/api/users/me/workout-cycles`;
  const daysUrl = `${apiBaseUrl}/api/users/me/workout-days`;
  const activitiesUrl = `${apiBaseUrl}/api/users/me/workout-activities`;
  const timestamp = '2026-10-16T10:30:00';
  const emptyList: ListWorkoutCyclesResponse = {
    cycles: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true },
  };
  const nullPrescription = {
    sets: null,
    repRangeMin: null,
    repRangeMax: null,
    targetLoadKg: null,
    targetLoadText: null,
    durationMinutes: null,
    distanceKm: null,
    intensityText: null,
    restSeconds: null,
    notes: null,
  };
  const hybridPrescription = {
    sets: 3,
    repRangeMin: 8,
    repRangeMax: 12,
    targetLoadKg: 20.5,
    targetLoadText: 'Carga moderada',
    durationMinutes: 10,
    distanceKm: 2.5,
    intensityText: 'Moderada',
    restSeconds: 60,
    notes: 'Controle de movimento',
  };
  let service: WorkoutPlanningService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    });
    service = TestBed.inject(WorkoutPlanningService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should fetch training goals and preserve the server catalog order', () => {
    const response: TrainingGoalResponse[] = [
      { id: 2, code: 'STRENGTH', name: 'Força' },
      { id: 1, code: 'HYPERTROPHY', name: 'Hipertrofia' },
    ];
    const next = vi.fn();
    service.getTrainingGoals().subscribe(next);
    const request = http.expectOne(`${apiBaseUrl}/api/training-goals`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it.each([
    { name: 'Plano', trainingGoalId: 2 },
    { name: 'Plano', trainingGoalId: 2, desiredDurationMonths: 3, notes: 'Foco em força' },
    { name: 'Plano', trainingGoalId: 2, desiredDurationMonths: null, notes: null },
  ] satisfies CreateWorkoutCycleRequest[])('should create a cycle with %j', (body) => {
    const response: CreateWorkoutCycleResponse = {
      id: 1,
      personId: 3,
      name: body.name,
      trainingGoalId: body.trainingGoalId,
      desiredDurationMonths: body.desiredDurationMonths ?? null,
      workoutStatus: 'NOT_STARTED',
      workoutOrigin: 'MANUAL',
      notes: body.notes ?? null,
      createdAt: timestamp,
    };
    const next = vi.fn();
    service.createWorkoutCycle(body).subscribe(next);
    const request = http.expectOne(cyclesUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.serializeBody()).toBe(JSON.stringify(body));
    request.flush(response, { status: 201, statusText: 'Created' });
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it.each([
    { name: 'Plano atualizado', trainingGoalId: 2 },
    { name: 'Plano atualizado', trainingGoalId: 2, desiredDurationMonths: 4, notes: 'Notas' },
    { name: 'Plano atualizado', trainingGoalId: 2, desiredDurationMonths: null, notes: null },
  ] satisfies UpdateWorkoutCycleRequest[])('should update a cycle with %j', (body) => {
    const response: UpdateWorkoutCycleResponse = {
      id: 1,
      name: body.name,
      trainingGoalId: body.trainingGoalId,
      startDate: null,
      workoutStatus: 'NOT_STARTED',
      workoutOrigin: 'MANUAL',
      desiredDurationMonths: body.desiredDurationMonths ?? null,
      notes: body.notes ?? null,
      updatedAt: timestamp,
    };
    const next = vi.fn();
    service.updateWorkoutCycle(1, body).subscribe(next);
    const request = http.expectOne(`${cyclesUrl}/1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.serializeBody()).toBe(JSON.stringify(body));
    request.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it.each([
    undefined,
    {},
    {
      workoutStatus: undefined,
      trainingGoalId: undefined,
      startDate: undefined,
      endDate: undefined,
      name: undefined,
    },
    { name: '', startDate: '', endDate: '' },
  ] satisfies (ListWorkoutCyclesRequest | undefined)[])(
    'should omit unspecified pagination and empty filters for %j',
    (filters) => {
      const next = vi.fn();
      service.listWorkoutCycles(undefined, undefined, filters).subscribe(next);
      const request = http.expectOne(cyclesUrl);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys()).toEqual([]);
      request.flush(emptyList);
      expect(next).toHaveBeenCalledExactlyOnceWith(emptyList);
    },
  );

  it('should list cycles without arguments using backend defaults', () => {
    service.listWorkoutCycles().subscribe();
    const request = http.expectOne(cyclesUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(emptyList);
  });

  it.each([
    [0, undefined, { page: '0' }],
    [undefined, 50, { size: '50' }],
    [2, 5, { page: '2', size: '5' }],
  ] as const)('should send supplied pagination (%s, %s)', (page, size, expected) => {
    service.listWorkoutCycles(page, size).subscribe();
    const request = http.expectOne((req) => req.url === cyclesUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(Object.keys(expected).sort());
    for (const [key, value] of Object.entries(expected)) {
      expect(request.request.params.get(key)).toBe(value);
    }
    request.flush(emptyList);
  });

  it.each([
    { workoutStatus: 'NOT_STARTED' },
    { workoutStatus: 'IN_PROGRESS' },
    { workoutStatus: 'COMPLETED' },
    { workoutStatus: 'CANCELLED' },
    { trainingGoalId: 2 },
    { name: 'Força & resistência' },
    { startDate: '2026-10-01' },
    { endDate: '2026-10-31' },
  ] satisfies ListWorkoutCyclesRequest[])(
    'should serialize only the supplied filter %j',
    (filters) => {
      service.listWorkoutCycles(undefined, undefined, filters).subscribe();
      const request = http.expectOne((req) => req.url === cyclesUrl);
      const [key, value] = Object.entries(filters)[0];
      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys()).toEqual([key]);
      expect(request.request.params.get(key)).toBe(String(value));
      request.flush(emptyList);
    },
  );

  it('should combine filters and pagination and preserve the cycles wrapper and server order', () => {
    const filters: ListWorkoutCyclesRequest = {
      workoutStatus: 'IN_PROGRESS',
      trainingGoalId: 2,
      name: 'Força & resistência',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    };
    const response: ListWorkoutCyclesResponse = {
      cycles: {
        content: [
          {
            id: 9,
            name: 'Força A',
            workoutStatus: 'IN_PROGRESS',
            trainingGoal: { id: 2, name: 'Força' },
            startDate: '2026-10-01',
            endDate: null,
            desiredDurationMonths: 3,
          },
          {
            id: 1,
            name: 'Força B',
            workoutStatus: 'IN_PROGRESS',
            trainingGoal: { id: 2, name: 'Força' },
            startDate: '2026-10-02',
            endDate: null,
            desiredDurationMonths: null,
          },
        ],
        page: 2,
        size: 2,
        totalElements: 6,
        totalPages: 3,
        last: true,
      },
    };
    const next = vi.fn();
    service.listWorkoutCycles(2, 2, filters).subscribe(next);
    const request = http.expectOne((req) => req.url === cyclesUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(
      ['page', 'size', ...Object.keys(filters)].sort(),
    );
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('2');
    for (const [key, value] of Object.entries(filters)) {
      expect(request.request.params.get(key)).toBe(String(value));
    }
    expect(request.request.urlWithParams).toContain('name=For%C3%A7a%20%26%20resist%C3%AAncia');
    request.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it('should fetch the complete detail projection without catalog fields or mappings', () => {
    const response: GetWorkoutCycleDetailResponse = {
      id: 1,
      name: 'Plano',
      workoutStatus: 'NOT_STARTED',
      trainingGoal: { id: 2, name: 'Força' },
      startDate: null,
      endDate: null,
      desiredDurationMonths: null,
      notes: null,
      days: [
        {
          id: 3,
          weekDay: 'MONDAY',
          title: 'Treino A',
          sortOrder: 1,
          activities: [
            {
              id: 4,
              orderIndex: 1,
              ...hybridPrescription,
              exercise: { id: 5, name: 'Supino', muscleGroups: [{ id: 6, name: 'Peitoral' }] },
            },
            {
              id: 7,
              orderIndex: 2,
              ...nullPrescription,
              exercise: { id: 8, name: 'Caminhada', muscleGroups: [] },
            },
          ],
        },
        { id: 9, weekDay: 'MONDAY', title: 'Treino B', sortOrder: 2, activities: [] },
      ],
    };
    const next = vi.fn();
    service.getWorkoutCycleDetail(1).subscribe(next);
    const request = http.expectOne(`${cyclesUrl}/1`);
    expect(request.request.method).toBe('GET');
    request.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it('should support a cycle detail without days', () => {
    const response: GetWorkoutCycleDetailResponse = {
      id: 1,
      name: 'Plano',
      workoutStatus: 'NOT_STARTED',
      trainingGoal: { id: 2, name: 'Força' },
      startDate: null,
      endDate: null,
      desiredDurationMonths: null,
      notes: null,
      days: [],
    };
    const next = vi.fn();
    service.getWorkoutCycleDetail(1).subscribe(next);
    http.expectOne(`${cyclesUrl}/1`).flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it('should start a cycle with no request body', () => {
    const response: StartWorkoutCycleResponse = {
      id: 1,
      trainingGoalId: 2,
      startDate: '2026-10-16',
      workoutStatus: 'IN_PROGRESS',
    };
    const next = vi.fn();
    service.startWorkoutCycle(1).subscribe(next);
    const request = http.expectOne(`${cyclesUrl}/1/start`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toBeNull();
    request.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it('should complete a cycle with no request body', () => {
    const response: CompleteWorkoutCycleResponse = {
      id: 1,
      trainingGoalId: 2,
      startDate: '2026-10-01',
      endDate: '2026-10-16',
      workoutStatus: 'COMPLETED',
    };
    const next = vi.fn();
    service.completeWorkoutCycle(1).subscribe(next);
    const request = http.expectOne(`${cyclesUrl}/1/complete`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toBeNull();
    request.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it('should cancel a cycle with no request body', () => {
    const response: CancelWorkoutCycleResponse = {
      id: 1,
      trainingGoalId: 2,
      workoutStatus: 'CANCELLED',
    };
    const next = vi.fn();
    service.cancelWorkoutCycle(1).subscribe(next);
    const request = http.expectOne(`${cyclesUrl}/1/cancel`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toBeNull();
    request.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it.each([
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ] satisfies WeekDay[])(
    'should create a day with REST weekDay %s and backend sortOrder',
    (weekDay) => {
      const body: CreateWorkoutDayRequest = { workoutCycleId: 1, weekDay, title: 'Treino A' };
      const response: CreateWorkoutDayResponse = {
        id: 3,
        ...body,
        sortOrder: 2,
        createdAt: timestamp,
      };
      const next = vi.fn();
      service.createWorkoutDay(body).subscribe(next);
      const request = http.expectOne(daysUrl);
      expect(request.request.method).toBe('POST');
      expect(request.request.serializeBody()).toBe(JSON.stringify(body));
      expect(request.request.body).not.toHaveProperty('sortOrder');
      request.flush(response, { status: 201, statusText: 'Created' });
      expect(next).toHaveBeenCalledExactlyOnceWith(response);
    },
  );

  it('should update only the title of a day', () => {
    const body = { title: 'Treino B' };
    const response: UpdateWorkoutDayResponse = {
      id: 3,
      workoutCycleId: 1,
      weekDay: 'MONDAY',
      title: body.title,
      sortOrder: 2,
      updatedAt: timestamp,
    };
    const next = vi.fn();
    service.updateWorkoutDay(3, body).subscribe(next);
    const request = http.expectOne(`${daysUrl}/3`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it.each([{}, nullPrescription, hybridPrescription])(
    'should create an activity with absent, null or hybrid prescription %j',
    (prescription) => {
      const body: CreateWorkoutActivityRequest = {
        workoutDayId: 3,
        exerciseId: 5,
        ...prescription,
      };
      const response: CreateWorkoutActivityResponse = {
        id: 4,
        workoutDayId: 3,
        exerciseId: 5,
        orderIndex: 2,
        ...nullPrescription,
        ...prescription,
        createdAt: timestamp,
      };
      const next = vi.fn();
      service.createWorkoutActivity(body).subscribe(next);
      const request = http.expectOne(activitiesUrl);
      expect(request.request.method).toBe('POST');
      expect(request.request.serializeBody()).toBe(JSON.stringify(body));
      expect(request.request.body).not.toHaveProperty('orderIndex');
      request.flush(response, { status: 201, statusText: 'Created' });
      expect(next).toHaveBeenCalledExactlyOnceWith(response);
    },
  );

  it.each([{}, nullPrescription, hybridPrescription])(
    'should update an activity with absent, null or hybrid prescription %j',
    (prescription) => {
      const body: UpdateWorkoutActivityRequest = { exerciseId: 8, ...prescription };
      const response: UpdateWorkoutActivityResponse = {
        id: 4,
        workoutDayId: 3,
        exerciseId: 8,
        orderIndex: 2,
        ...nullPrescription,
        ...prescription,
        updatedAt: timestamp,
      };
      const next = vi.fn();
      service.updateWorkoutActivity(4, body).subscribe(next);
      const request = http.expectOne(`${activitiesUrl}/4`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.serializeBody()).toBe(JSON.stringify(body));
      request.flush(response);
      expect(next).toHaveBeenCalledExactlyOnceWith(response);
    },
  );

  it.each([
    ['deleteWorkoutCycle', cyclesUrl, 1],
    ['deleteWorkoutDay', daysUrl, 3],
    ['deleteWorkoutActivity', activitiesUrl, 4],
  ] as const)('should complete %s with 204 No Content', (method, url, id) => {
    const next = vi.fn();
    const complete = vi.fn();
    service[method](id).subscribe({ next, complete });
    const request = http.expectOne(`${url}/${id}`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(next).toHaveBeenCalledExactlyOnceWith(null);
    expect(complete).toHaveBeenCalledOnce();
  });

  it('should reorder a day with the target weekDay and sortOrder and emit no content', () => {
    const next = vi.fn();
    const complete = vi.fn();
    service
      .reorderWorkoutDay(3, { weekDay: 'TUESDAY', sortOrder: 2 })
      .subscribe({ next, complete });
    const request = http.expectOne(`${daysUrl}/3/reorder`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.serializeBody()).toBe('{"weekDay":"TUESDAY","sortOrder":2}');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(next).toHaveBeenCalledExactlyOnceWith(null);
    expect(complete).toHaveBeenCalledOnce();
  });

  it('should reorder an activity with orderIndex and emit no content', () => {
    const next = vi.fn();
    const complete = vi.fn();
    service.reorderWorkoutActivity(4, { orderIndex: 2 }).subscribe({ next, complete });
    const request = http.expectOne(`${activitiesUrl}/4/reorder`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ orderIndex: 2 });
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(next).toHaveBeenCalledExactlyOnceWith(null);
    expect(complete).toHaveBeenCalledOnce();
  });

  it.each([
    ['getTrainingGoals', (service: WorkoutPlanningService) => service.getTrainingGoals()],
    ['listWorkoutCycles', (service: WorkoutPlanningService) => service.listWorkoutCycles()],
    [
      'createWorkoutCycle',
      (service: WorkoutPlanningService) =>
        service.createWorkoutCycle({ name: 'Plano', trainingGoalId: 2 }),
    ],
    [
      'getWorkoutCycleDetail',
      (service: WorkoutPlanningService) => service.getWorkoutCycleDetail(1),
    ],
    [
      'updateWorkoutCycle',
      (service: WorkoutPlanningService) =>
        service.updateWorkoutCycle(1, { name: 'Plano', trainingGoalId: 2 }),
    ],
    ['deleteWorkoutCycle', (service: WorkoutPlanningService) => service.deleteWorkoutCycle(1)],
    ['startWorkoutCycle', (service: WorkoutPlanningService) => service.startWorkoutCycle(1)],
    ['completeWorkoutCycle', (service: WorkoutPlanningService) => service.completeWorkoutCycle(1)],
    ['cancelWorkoutCycle', (service: WorkoutPlanningService) => service.cancelWorkoutCycle(1)],
    [
      'createWorkoutDay',
      (service: WorkoutPlanningService) =>
        service.createWorkoutDay({ workoutCycleId: 1, weekDay: 'MONDAY', title: 'Treino A' }),
    ],
    [
      'updateWorkoutDay',
      (service: WorkoutPlanningService) => service.updateWorkoutDay(3, { title: 'Treino B' }),
    ],
    ['deleteWorkoutDay', (service: WorkoutPlanningService) => service.deleteWorkoutDay(3)],
    [
      'reorderWorkoutDay',
      (service: WorkoutPlanningService) =>
        service.reorderWorkoutDay(3, { weekDay: 'TUESDAY', sortOrder: 2 }),
    ],
    [
      'createWorkoutActivity',
      (service: WorkoutPlanningService) =>
        service.createWorkoutActivity({ workoutDayId: 3, exerciseId: 5 }),
    ],
    [
      'updateWorkoutActivity',
      (service: WorkoutPlanningService) => service.updateWorkoutActivity(4, { exerciseId: 5 }),
    ],
    [
      'deleteWorkoutActivity',
      (service: WorkoutPlanningService) => service.deleteWorkoutActivity(4),
    ],
    [
      'reorderWorkoutActivity',
      (service: WorkoutPlanningService) => service.reorderWorkoutActivity(4, { orderIndex: 2 }),
    ],
  ] satisfies [string, (service: WorkoutPlanningService) => Observable<unknown>][])(
    'should propagate HTTP errors from %s without emitting or completing',
    (_method, invoke) => {
      const next = vi.fn();
      const error = vi.fn();
      const complete = vi.fn();
      const result: Observable<unknown> = invoke(service);
      result.subscribe({ next, error, complete });
      const request = http.expectOne(() => true);
      const body = { message: 'Operação não permitida' };
      request.flush(body, { status: 422, statusText: 'Unprocessable Entity' });
      expect(error).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ status: 422, error: body }),
      );
      expect(next).not.toHaveBeenCalled();
      expect(complete).not.toHaveBeenCalled();
    },
  );
});
