import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

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
    return this.http.post<void>(`${this.apiBaseUrl}/api/users/me/change-password`, request);
  }
}
