import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/http/api-base-url.token';

import {
  BodyMetricsProgressChangesRequest,
  BodyMetricsProgressChangesResponse,
  BodyMetricsProgressChartRequest,
  BodyMetricsProgressChartResponse,
  CreateBodyMetricsRequest,
  CreateBodyMetricsResponse,
  GetBodyMetricsResponse,
  GetLatestBodyMetricsResponse,
  ListBodyMetricsResponse,
  UpdateBodyMetricsRequest,
  UpdateBodyMetricsResponse,
} from './body-metrics.models';

@Injectable({
  providedIn: 'root',
})
export class BodyMetricsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly baseUrl = `${this.apiBaseUrl}/api/users/me/body-metrics`;

  create(request: CreateBodyMetricsRequest): Observable<CreateBodyMetricsResponse> {
    return this.http.post<CreateBodyMetricsResponse>(this.baseUrl, request);
  }

  update(id: number, request: UpdateBodyMetricsRequest): Observable<UpdateBodyMetricsResponse> {
    return this.http.put<UpdateBodyMetricsResponse>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  list(page = 0, size = 20): Observable<ListBodyMetricsResponse> {
    const params = new HttpParams().set('page', page).set('size', size);

    return this.http.get<ListBodyMetricsResponse>(this.baseUrl, { params });
  }

  getById(id: number): Observable<GetBodyMetricsResponse> {
    return this.http.get<GetBodyMetricsResponse>(`${this.baseUrl}/${id}`);
  }

  getLatest(): Observable<GetLatestBodyMetricsResponse> {
    return this.http.get<GetLatestBodyMetricsResponse>(`${this.baseUrl}/latest`);
  }

  getBodyComposition(
    request: BodyMetricsProgressChartRequest,
  ): Observable<BodyMetricsProgressChartResponse> {
    const params = new HttpParams()
      .set('startDate', request.startDate)
      .set('endDate', request.endDate);

    return this.http.get<BodyMetricsProgressChartResponse>(
      `${this.baseUrl}/progress/body-composition`,
      { params },
    );
  }

  getCircumferences(
    request: BodyMetricsProgressChartRequest,
  ): Observable<BodyMetricsProgressChartResponse> {
    const params = new HttpParams()
      .set('startDate', request.startDate)
      .set('endDate', request.endDate);

    return this.http.get<BodyMetricsProgressChartResponse>(
      `${this.baseUrl}/progress/circumferences`,
      { params },
    );
  }

  getBodyFat(
    request: BodyMetricsProgressChartRequest,
  ): Observable<BodyMetricsProgressChartResponse> {
    const params = new HttpParams()
      .set('startDate', request.startDate)
      .set('endDate', request.endDate);

    return this.http.get<BodyMetricsProgressChartResponse>(`${this.baseUrl}/progress/body-fat`, {
      params,
    });
  }

  getChanges(
    request: BodyMetricsProgressChangesRequest,
  ): Observable<BodyMetricsProgressChangesResponse> {
    const params = new HttpParams()
      .set('startDate', request.startDate)
      .set('endDate', request.endDate);

    return this.http.get<BodyMetricsProgressChangesResponse>(`${this.baseUrl}/progress/changes`, {
      params,
    });
  }
}
