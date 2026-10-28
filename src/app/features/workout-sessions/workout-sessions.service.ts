import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import {
  ExerciseCardioEvolutionResponse,
  ExerciseStrengthEvolutionResponse,
  WorkoutSessionAnalyticsPeriod,
} from './workout-session-analytics.models';
import {
  CloseWorkoutSessionResponse,
  GetWorkoutSessionDetailResponse,
  StartWorkoutSessionRequest,
  StartWorkoutSessionResponse,
  UpdateWorkoutSessionNotesRequest,
  UpdateWorkoutSessionActivityExecutionRequest,
  CreateWorkoutSessionSetRequest,
  UpdateWorkoutSessionSetRequest,
  ChangeWorkoutSessionActivityLoadModeRequest,
  WorkoutSessionActivityDetailResponse,
  WorkoutSessionSetDetailResponse,
  WorkoutSessionHistoryFilters,
  ListWorkoutSessionsResponse,
} from './workout-sessions.models';

@Injectable({ providedIn: 'root' })
export class WorkoutSessionsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly sessionsUrl = `${this.apiBaseUrl}/api/users/me/workout-sessions`;

  getStrengthEvolution(exerciseId: number, period: WorkoutSessionAnalyticsPeriod): Observable<ExerciseStrengthEvolutionResponse> {
    const params = new HttpParams().set('startDate', period.startDate).set('endDate', period.endDate);
    return this.http.get<ExerciseStrengthEvolutionResponse>(
      `${this.sessionsUrl}/analytics/exercises/${exerciseId}/strength`, { params },
    );
  }

  getCardioEvolution(exerciseId: number, period: WorkoutSessionAnalyticsPeriod): Observable<ExerciseCardioEvolutionResponse> {
    const params = new HttpParams().set('startDate', period.startDate).set('endDate', period.endDate);
    return this.http.get<ExerciseCardioEvolutionResponse>(
      `${this.sessionsUrl}/analytics/exercises/${exerciseId}/cardio`, { params },
    );
  }

  listWorkoutSessions(
    page = 0, size = 20, filters: WorkoutSessionHistoryFilters = {},
  ): Observable<ListWorkoutSessionsResponse> {
    let params = new HttpParams().set('page', page).set('size', size);
    for (const key of ['name', 'workoutCycleId', 'workoutDayId', 'startDate', 'endDate'] as const) {
      const value = filters[key];
      if (value !== undefined && value !== '') params = params.set(key, value);
    }
    return this.http.get<ListWorkoutSessionsResponse>(this.sessionsUrl, { params });
  }

  startWorkoutSession(
    request: StartWorkoutSessionRequest,
  ): Observable<StartWorkoutSessionResponse> {
    return this.http.post<StartWorkoutSessionResponse>(this.sessionsUrl, request);
  }

  getInProgressWorkoutSession(): Observable<GetWorkoutSessionDetailResponse | null> {
    return this.http.get<GetWorkoutSessionDetailResponse>(`${this.sessionsUrl}/in-progress`).pipe(
      catchError((error: HttpErrorResponse) =>
        error.status === 404 &&
        error.error?.message === 'Sessão de treino em andamento não encontrada.'
          ? of(null)
          : throwError(() => error),
      ),
    );
  }

  getWorkoutSessionDetail(id: number): Observable<GetWorkoutSessionDetailResponse> {
    return this.http.get<GetWorkoutSessionDetailResponse>(`${this.sessionsUrl}/${id}`);
  }

  closeWorkoutSession(id: number): Observable<CloseWorkoutSessionResponse> {
    return this.http.patch<CloseWorkoutSessionResponse>(`${this.sessionsUrl}/${id}/close`, null);
  }

  updateWorkoutSessionNotes(id: number, request: UpdateWorkoutSessionNotesRequest) {
    return this.http.patch<GetWorkoutSessionDetailResponse>(`${this.sessionsUrl}/${id}/notes`, request);
  }

  updateWorkoutSessionActivityExecution(
    id: number, activityId: number, request: UpdateWorkoutSessionActivityExecutionRequest,
  ) {
    return this.http.patch<WorkoutSessionActivityDetailResponse>(
      `${this.sessionsUrl}/${id}/activities/${activityId}/execution`, request,
    );
  }

  createWorkoutSessionSet(id: number, activityId: number, request: CreateWorkoutSessionSetRequest) {
    return this.http.post<WorkoutSessionSetDetailResponse>(
      `${this.sessionsUrl}/${id}/activities/${activityId}/sets`, request,
    );
  }

  updateWorkoutSessionSet(
    id: number, activityId: number, setId: number, request: UpdateWorkoutSessionSetRequest,
  ) {
    return this.http.patch<WorkoutSessionSetDetailResponse>(
      `${this.sessionsUrl}/${id}/activities/${activityId}/sets/${setId}`, request,
    );
  }

  deleteWorkoutSessionSet(id: number, activityId: number, setId: number): Observable<void> {
    return this.http.delete<void>(`${this.sessionsUrl}/${id}/activities/${activityId}/sets/${setId}`);
  }

  changeWorkoutSessionActivityLoadMode(
    id: number, activityId: number, request: ChangeWorkoutSessionActivityLoadModeRequest,
  ) {
    return this.http.patch<WorkoutSessionActivityDetailResponse>(
      `${this.sessionsUrl}/${id}/activities/${activityId}/load-mode`, request,
    );
  }
}
