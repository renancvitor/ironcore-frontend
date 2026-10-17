import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
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
  ReorderWorkoutActivityRequest,
  ReorderWorkoutDayRequest,
  StartWorkoutCycleResponse,
  TrainingGoalResponse,
  UpdateWorkoutActivityRequest,
  UpdateWorkoutActivityResponse,
  UpdateWorkoutCycleRequest,
  UpdateWorkoutCycleResponse,
  UpdateWorkoutDayRequest,
  UpdateWorkoutDayResponse,
} from './workout-planning.models';

@Injectable({
  providedIn: 'root',
})
export class WorkoutPlanningService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly cyclesUrl = `${this.apiBaseUrl}/api/users/me/workout-cycles`;
  private readonly daysUrl = `${this.apiBaseUrl}/api/users/me/workout-days`;
  private readonly activitiesUrl = `${this.apiBaseUrl}/api/users/me/workout-activities`;

  listWorkoutCycles(
    page?: number,
    size?: number,
    request?: ListWorkoutCyclesRequest,
  ): Observable<ListWorkoutCyclesResponse> {
    let params = new HttpParams();

    if (page !== undefined) {
      params = params.set('page', page);
    }

    if (size !== undefined) {
      params = params.set('size', size);
    }

    for (const key of [
      'workoutStatus',
      'trainingGoalId',
      'startDate',
      'endDate',
      'name',
    ] as const) {
      const value = request?.[key];
      if (value !== undefined && value !== '') {
        params = params.set(key, value);
      }
    }

    return this.http.get<ListWorkoutCyclesResponse>(this.cyclesUrl, { params });
  }

  getTrainingGoals(): Observable<TrainingGoalResponse[]> {
    return this.http.get<TrainingGoalResponse[]>(`${this.apiBaseUrl}/api/training-goals`);
  }

  createWorkoutCycle(request: CreateWorkoutCycleRequest): Observable<CreateWorkoutCycleResponse> {
    return this.http.post<CreateWorkoutCycleResponse>(this.cyclesUrl, request);
  }

  getWorkoutCycleDetail(id: number): Observable<GetWorkoutCycleDetailResponse> {
    return this.http.get<GetWorkoutCycleDetailResponse>(`${this.cyclesUrl}/${id}`);
  }

  updateWorkoutCycle(
    id: number,
    request: UpdateWorkoutCycleRequest,
  ): Observable<UpdateWorkoutCycleResponse> {
    return this.http.put<UpdateWorkoutCycleResponse>(`${this.cyclesUrl}/${id}`, request);
  }

  deleteWorkoutCycle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.cyclesUrl}/${id}`);
  }

  startWorkoutCycle(id: number): Observable<StartWorkoutCycleResponse> {
    return this.http.patch<StartWorkoutCycleResponse>(`${this.cyclesUrl}/${id}/start`, null);
  }

  completeWorkoutCycle(id: number): Observable<CompleteWorkoutCycleResponse> {
    return this.http.patch<CompleteWorkoutCycleResponse>(`${this.cyclesUrl}/${id}/complete`, null);
  }

  cancelWorkoutCycle(id: number): Observable<CancelWorkoutCycleResponse> {
    return this.http.patch<CancelWorkoutCycleResponse>(`${this.cyclesUrl}/${id}/cancel`, null);
  }

  createWorkoutDay(request: CreateWorkoutDayRequest): Observable<CreateWorkoutDayResponse> {
    return this.http.post<CreateWorkoutDayResponse>(this.daysUrl, request);
  }

  updateWorkoutDay(
    id: number,
    request: UpdateWorkoutDayRequest,
  ): Observable<UpdateWorkoutDayResponse> {
    return this.http.put<UpdateWorkoutDayResponse>(`${this.daysUrl}/${id}`, request);
  }

  deleteWorkoutDay(id: number): Observable<void> {
    return this.http.delete<void>(`${this.daysUrl}/${id}`);
  }

  reorderWorkoutDay(id: number, request: ReorderWorkoutDayRequest): Observable<void> {
    return this.http.patch<void>(`${this.daysUrl}/${id}/reorder`, request);
  }

  createWorkoutActivity(
    request: CreateWorkoutActivityRequest,
  ): Observable<CreateWorkoutActivityResponse> {
    return this.http.post<CreateWorkoutActivityResponse>(this.activitiesUrl, request);
  }

  updateWorkoutActivity(
    id: number,
    request: UpdateWorkoutActivityRequest,
  ): Observable<UpdateWorkoutActivityResponse> {
    return this.http.put<UpdateWorkoutActivityResponse>(`${this.activitiesUrl}/${id}`, request);
  }

  deleteWorkoutActivity(id: number): Observable<void> {
    return this.http.delete<void>(`${this.activitiesUrl}/${id}`);
  }

  reorderWorkoutActivity(id: number, request: ReorderWorkoutActivityRequest): Observable<void> {
    return this.http.patch<void>(`${this.activitiesUrl}/${id}/reorder`, request);
  }
}
