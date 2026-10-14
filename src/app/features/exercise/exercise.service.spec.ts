import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/http/api-base-url.token';
import {
  ActivityTypeItemResponse,
  EquipmentTypeItemResponse,
  GetExerciseByIdResponse,
  ListExercisesRequest,
  ListExercisesResponse,
  MuscleGroupItemResponse,
  MuscleSubgroupItemResponse,
} from './exercise.models';
import { ExerciseService } from './exercise.service';

describe('ExerciseService', () => {
  const apiBaseUrl = 'https://api.ironcore.test';
  const baseUrl = `${apiBaseUrl}/api/exercise-catalog`;
  const activityType: ActivityTypeItemResponse = { id: 1, code: 'STRENGTH', name: 'Força' };
  const equipmentType: EquipmentTypeItemResponse = { id: 2, code: 'BARBELL', name: 'Barra' };
  const muscleGroup: MuscleGroupItemResponse = { id: 3, code: 'CHEST', name: 'Peitoral' };
  const muscleSubgroup: MuscleSubgroupItemResponse = {
    id: 4,
    code: 'PECTORALIS_MAJOR',
    muscleGroupId: 3,
    name: 'Peitoral maior',
  };
  const exercise: GetExerciseByIdResponse = {
    id: 10,
    name: 'Supino reto',
    equipmentType,
    activityType,
    unilateral: false,
    compound: true,
    suggestedRestSeconds: 90,
    active: true,
    muscleTargets: [{ muscleSubgroup, targetRole: 'PRIMARY' }],
  };
  const emptyList: ListExercisesResponse = {
    exercises: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true },
  };
  let service: ExerciseService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    });
    service = TestBed.inject(ExerciseService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should repeat plural parameters and remove duplicates', () => {
    service
      .list(0, 20, {
        activityTypeIds: [1, 2],
        equipmentTypeIds: [2, 3, 2],
        muscleGroupIds: [4, 5],
        muscleSubgroupIds: [6, 7],
        targetRoles: ['PRIMARY', 'SECONDARY', 'PRIMARY'],
      })
      .subscribe();
    const request = http.expectOne((req) => req.url === `${baseUrl}/exercises`);
    expect(request.request.params.getAll('activityTypeIds')).toEqual(['1', '2']);
    expect(request.request.params.getAll('equipmentTypeIds')).toEqual(['2', '3']);
    expect(request.request.params.getAll('muscleGroupIds')).toEqual(['4', '5']);
    expect(request.request.params.getAll('muscleSubgroupIds')).toEqual(['6', '7']);
    expect(request.request.params.getAll('targetRoles')).toEqual(['PRIMARY', 'SECONDARY']);
    expect(request.request.params.has('equipmentTypeId')).toBe(false);
    request.flush(emptyList);
  });

  it('should omit empty plural filters', () => {
    service
      .list(undefined, undefined, {
        activityTypeIds: [],
        equipmentTypeIds: [],
        muscleGroupIds: [],
        muscleSubgroupIds: [],
        targetRoles: [],
      })
      .subscribe();
    http.expectOne(`${baseUrl}/exercises`).flush(emptyList);
  });

  it.each([
    ['getActivityTypes', 'activity-types', [activityType]],
    ['getEquipmentTypes', 'equipment-types', [equipmentType]],
    ['getMuscleGroups', 'muscle-groups', [muscleGroup]],
    ['getMuscleSubgroups', 'muscle-subgroups', [muscleSubgroup]],
  ] as const)('should fetch and emit the catalog from %s', (method, path, response) => {
    const next = vi.fn();
    service[method]().subscribe(next);
    const request = http.expectOne(`${baseUrl}/${path}`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush([...response]);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it.each([3, 0])('should filter muscle subgroups by muscle group %s', (muscleGroupId) => {
    const next = vi.fn();
    service.getMuscleSubgroups(muscleGroupId).subscribe(next);
    const request = http.expectOne(`${baseUrl}/muscle-subgroups?muscleGroupId=${muscleGroupId}`);
    expect(request.request.method).toBe('GET');
    request.flush([muscleSubgroup]);
    expect(next).toHaveBeenCalledExactlyOnceWith([muscleSubgroup]);
  });

  it.each([90, null])('should fetch exercise details with rest seconds %s', (restSeconds) => {
    const response: GetExerciseByIdResponse = { ...exercise, suggestedRestSeconds: restSeconds };
    const next = vi.fn();
    service.getExerciseById(10).subscribe(next);
    const request = http.expectOne(`${baseUrl}/exercises/10`);
    expect(request.request.method).toBe('GET');
    request.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it.each([undefined, {}, { name: undefined, activityTypeId: undefined }])(
    'should omit unspecified filters and pagination for %j',
    (filters) => {
      const next = vi.fn();
      service.list(undefined, undefined, filters).subscribe(next);
      const request = http.expectOne(`${baseUrl}/exercises`);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys()).toEqual([]);
      request.flush(emptyList);
      expect(next).toHaveBeenCalledExactlyOnceWith(emptyList);
    },
  );

  it('should combine all filters and pagination and emit the paginated response', () => {
    const filters: ListExercisesRequest = {
      name: 'Supino & halteres',
      activityTypeId: 1,
      equipmentTypeId: 2,
      muscleGroupId: 3,
      muscleSubgroupId: 4,
      targetRole: 'PRIMARY',
    };
    const response: ListExercisesResponse = {
      exercises: {
        content: [exercise],
        page: 2,
        size: 5,
        totalElements: 11,
        totalPages: 3,
        last: true,
      },
    };
    const next = vi.fn();
    service.list(2, 5, filters).subscribe(next);
    const request = http.expectOne((req) => req.url === `${baseUrl}/exercises`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(
      ['page', 'size', ...Object.keys(filters)].sort(),
    );
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('5');
    for (const [key, value] of Object.entries(filters)) {
      expect(request.request.params.get(key)).toBe(String(value));
    }
    request.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });

  it.each([
    [0, undefined, 'page', '0'],
    [undefined, 50, 'size', '50'],
  ] as const)(
    'should send only the supplied pagination parameter (%s, %s)',
    (page, size, key, value) => {
      service.list(page, size).subscribe();
      const request = http.expectOne(`${baseUrl}/exercises?${key}=${value}`);
      expect(request.request.method).toBe('GET');
      request.flush(emptyList);
    },
  );

  it.each([
    { name: 'Elevação & extensão' },
    { name: '' },
    { activityTypeId: 0 },
    { equipmentTypeId: 0 },
    { muscleGroupId: 0 },
    { muscleSubgroupId: 0 },
    { targetRole: 'PRIMARY' },
    { targetRole: 'SECONDARY' },
    { targetRole: 'STABILIZER' },
  ] satisfies ListExercisesRequest[])('should send only the supplied filter %j', (filters) => {
    service.list(undefined, undefined, filters).subscribe();
    const request = http.expectOne((req) => req.url === `${baseUrl}/exercises`);
    const [key, value] = Object.entries(filters)[0];
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([key]);
    expect(request.request.params.get(key)).toBe(String(value));
    request.flush(emptyList);
  });

  it.each([
    ['getActivityTypes', 'activity-types', 500],
    ['getEquipmentTypes', 'equipment-types', 500],
    ['getMuscleGroups', 'muscle-groups', 500],
    ['getMuscleSubgroups', 'muscle-subgroups?muscleGroupId=10', 500],
    ['getExerciseById', 'exercises/10', 404],
    ['list', 'exercises?page=10', 500],
  ] as const)('should propagate HTTP errors from %s', (method, path, status) => {
    const next = vi.fn();
    const error = vi.fn();
    const result: Observable<unknown> = service[method](10);
    result.subscribe({ next, error });
    const request = http.expectOne(`${baseUrl}/${path}`);
    const body = { message: 'Não foi possível consultar o catálogo' };
    request.flush(body, {
      status,
      statusText: status === 404 ? 'Not Found' : 'Internal Server Error',
    });
    expect(error).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ status, error: body }));
    expect(next).not.toHaveBeenCalled();
  });
});
