import { HttpClient, HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../http/api-base-url.token';
import { AuthStateService } from './auth-state.service';
import { AuthService } from './auth.service';
import { AuthenticatedUser, LoginResponse } from './auth.models';

describe('AuthService', () => {
  const apiBaseUrl = 'https://api.ironcore.test';
  const user: AuthenticatedUser = {
    userId: 1,
    email: 'renan@ironcore.test',
    nickname: 'Renan',
    mustChangePassword: false,
  };

  let authService: AuthService;
  let authState: AuthStateService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: API_BASE_URL,
          useValue: apiBaseUrl,
        },
      ],
    });

    authService = TestBed.inject(AuthService);
    authState = TestBed.inject(AuthStateService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should store the authenticated user after login', () => {
    const response: LoginResponse = {
      ...user,
      accessToken: 'access-token',
      tokenType: 'Bearer',
      expiresAt: '2026-09-04T00:00:00Z',
    };

    authService.login({ email: user.email, password: 'password' }).subscribe();

    const request = httpTestingController.expectOne(`${apiBaseUrl}/api/auth/login`);
    expect(request.request.method).toBe('POST');

    request.flush(response);

    expect(authState.currentUser()).toEqual(user);
  });

  it('should clear the authenticated user after logout', () => {
    authState.setUser(user);

    authService.logout().subscribe();

    const request = httpTestingController.expectOne(`${apiBaseUrl}/api/auth/logout`);
    expect(request.request.method).toBe('POST');

    request.flush(null);

    expect(authState.currentUser()).toBeNull();
  });

  it('should restore the authenticated user from the session endpoint', () => {
    authService.restoreSession().subscribe();

    const request = httpTestingController.expectOne(`${apiBaseUrl}/api/users/me`);
    expect(request.request.method).toBe('GET');

    request.flush(user);

    expect(authState.currentUser()).toEqual(user);
  });

  it('should complete without an error when no authenticated session exists', () => {
    let completed = false;
    let receivedError = false;

    authService.restoreSession().subscribe({
      error: () => {
        receivedError = true;
      },
      complete: () => {
        completed = true;
      },
    });

    const request = httpTestingController.expectOne(`${apiBaseUrl}/api/users/me`);
    request.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(completed).toBe(true);
    expect(receivedError).toBe(false);
    expect(authState.currentUser()).toBeNull();
  });

  it('should propagate unexpected errors during session restoration', () => {
    let receivedError: HttpErrorResponse | undefined;

    authService.restoreSession().subscribe({
      error: (error: HttpErrorResponse) => {
        receivedError = error;
      },
    });

    const request = httpTestingController.expectOne(`${apiBaseUrl}/api/users/me`);
    request.flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(receivedError?.status).toBe(500);
  });
});
