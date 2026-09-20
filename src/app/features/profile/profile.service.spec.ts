import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/http/api-base-url.token';
import { ChangePasswordRequest, ChangeNicknameRequest, UpdatePersonRequest } from './profile.models';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  const apiBaseUrl = 'https://api.ironcore.test';

  let service: ProfileService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    });

    service = TestBed.inject(ProfileService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should get the authenticated user person', () => {
    service.getPerson().subscribe();

    const request = httpTestingController.expectOne(`${apiBaseUrl}/api/users/me/person`);

    expect(request.request.method).toBe('GET');
    request.flush({ personId: 1, name: 'Renan', sex: 'MALE', birthDate: '1990-01-01' });
  });

  it('should change the authenticated user nickname', () => {
    const body: ChangeNicknameRequest = { nickname: 'renan.dev' };

    service.changeNickname(body).subscribe();

    const request = httpTestingController.expectOne(`${apiBaseUrl}/api/users/me/change-nickname`);

    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({ nickname: body.nickname });
  });

  it('should update only the supplied person fields', () => {
    const body: UpdatePersonRequest = { name: 'Renan Vitor' };

    service.updatePerson(body).subscribe();

    const request = httpTestingController.expectOne(`${apiBaseUrl}/api/users/me/person`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(body);
    request.flush({ name: body.name, sex: 'MALE', birthDate: '1990-01-01' });
  });

  it('should send the password change request to the authenticated endpoint', () => {
    const body: ChangePasswordRequest = {
      currentPassword: 'current-password',
      newPassword: 'new-password',
      confirmNewPassword: 'new-password',
    };

    service.changePassword(body).subscribe();

    const request = httpTestingController.expectOne(`${apiBaseUrl}/api/users/me/change-password`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
