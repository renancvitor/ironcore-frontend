import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import { Observable } from 'rxjs';
import {
  ActivityTypeItemResponse,
  EquipmentTypeItemResponse,
  GetExerciseByIdResponse,
  ListExercisesRequest,
  ListExercisesResponse,
  MuscleGroupItemResponse,
  MuscleSubgroupItemResponse,
} from './exercise.models';

@Injectable({
  providedIn: 'root',
})
export class ExerciseService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly baseUrl = `${this.apiBaseUrl}/api/exercise-catalog`;

  getActivityTypes(): Observable<ActivityTypeItemResponse[]> {
    return this.http.get<ActivityTypeItemResponse[]>(`${this.baseUrl}/activity-types`);
  }

  getEquipmentTypes(): Observable<EquipmentTypeItemResponse[]> {
    return this.http.get<EquipmentTypeItemResponse[]>(`${this.baseUrl}/equipment-types`);
  }

  getMuscleGroups(): Observable<MuscleGroupItemResponse[]> {
    return this.http.get<MuscleGroupItemResponse[]>(`${this.baseUrl}/muscle-groups`);
  }

  getMuscleSubgroups(muscleGroupId?: number): Observable<MuscleSubgroupItemResponse[]> {
    let params = new HttpParams();

    if (muscleGroupId !== undefined) {
      params = params.set('muscleGroupId', muscleGroupId);
    }

    return this.http.get<MuscleSubgroupItemResponse[]>(`${this.baseUrl}/muscle-subgroups`, {
      params,
    });
  }

  getExerciseById(id: number): Observable<GetExerciseByIdResponse> {
    return this.http.get<GetExerciseByIdResponse>(`${this.baseUrl}/exercises/${id}`);
  }

  list(
    page?: number,
    size?: number,
    request?: ListExercisesRequest,
  ): Observable<ListExercisesResponse> {
    let params = new HttpParams();

    if (page !== undefined) {
      params = params.set('page', page);
    }

    if (size !== undefined) {
      params = params.set('size', size);
    }

    if (request?.name !== undefined) {
      params = params.set('name', request.name);
    }

    if (request?.activityTypeId !== undefined) {
      params = params.set('activityTypeId', request.activityTypeId);
    }

    if (request?.equipmentTypeId !== undefined) {
      params = params.set('equipmentTypeId', request.equipmentTypeId);
    }

    if (request?.muscleGroupId !== undefined) {
      params = params.set('muscleGroupId', request.muscleGroupId);
    }

    if (request?.muscleSubgroupId !== undefined) {
      params = params.set('muscleSubgroupId', request.muscleSubgroupId);
    }

    if (request?.targetRole !== undefined) {
      params = params.set('targetRole', request.targetRole);
    }

    for (const key of [
      'activityTypeIds',
      'equipmentTypeIds',
      'muscleGroupIds',
      'muscleSubgroupIds',
      'targetRoles',
    ] as const) {
      for (const value of new Set<string | number>(request?.[key] ?? [])) {
        params = params.append(key, value);
      }
    }

    return this.http.get<ListExercisesResponse>(`${this.baseUrl}/exercises`, {
      params,
    });
  }
}
