import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { catchError, switchMap, throwError } from 'rxjs';

import { SessionService, SKIP_SESSION_RECOVERY } from '../../core/auth/session.service';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import {
  ChangeNicknameRequest,
  ChangeNicknameResponse,
  ChangePasswordRequest,
  Person,
  UpdatePersonRequest,
  UpdatePersonResponse,
} from './profile.models';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getPerson() {
    return this.http.get<Person>(`${this.apiBaseUrl}/api/users/me/person`);
  }

  changeNickname(request: ChangeNicknameRequest) {
    return this.http.put<ChangeNicknameResponse>(
      `${this.apiBaseUrl}/api/users/me/change-nickname`,
      request,
    );
  }

  updatePerson(request: UpdatePersonRequest) {
    return this.http.patch<UpdatePersonResponse>(`${this.apiBaseUrl}/api/users/me/person`, request);
  }

  changePassword(request: ChangePasswordRequest) {
    return this.session
      .mutate(
        () =>
          this.http.post<void>(`${this.apiBaseUrl}/api/users/me/change-password`, request, {
            context: new HttpContext().set(SKIP_SESSION_RECOVERY, true),
          }),
        'changed',
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status !== 401) return throwError(() => error);
          return this.session.recover().pipe(
            catchError((failure: HttpErrorResponse) => {
              if (failure.status === 401)
                void this.router.navigate(['/login']).catch(() => undefined);
              return throwError(() => failure);
            }),
            switchMap(() => throwError(() => error)),
          );
        }),
      );
  }
}
