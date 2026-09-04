import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, EMPTY, tap, throwError } from 'rxjs';

import { API_BASE_URL } from '../http/api-base-url.token';
import { AuthStateService } from './auth-state.service';
import { AuthenticatedUser, LoginRequest, LoginResponse } from './auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly authState = inject(AuthStateService);

  login(request: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/api/auth/login`, request).pipe(
      tap((response) => {
        this.authState.setUser({
          userId: response.userId,
          email: response.email,
          nickname: response.nickname,
          mustChangePassword: response.mustChangePassword,
        });
      }),
    );
  }

  restoreSession() {
    return this.http.get<AuthenticatedUser>(`${this.apiBaseUrl}/api/users/me`).pipe(
      tap((user) => {
        this.authState.setUser(user);
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return EMPTY;
        }

        return throwError(() => error);
      }),
    );
  }

  logout() {
    return this.http.post<void>(`${this.apiBaseUrl}/api/auth/logout`, {}).pipe(
      tap(() => {
        this.authState.clear();
      }),
    );
  }
}
