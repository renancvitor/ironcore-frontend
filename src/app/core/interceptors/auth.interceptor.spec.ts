import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthStateService } from '../auth/auth-state.service';
import { API_BASE_URL } from '../http/api-base-url.token';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let authState: AuthStateService;
  let navigationToLoginInProgress = false;
  const router = {
    url: '/profile',
    currentNavigation: vi.fn(() => navigationToLoginInProgress ? {
      initialUrl: { toString: () => '/login' },
    } : null),
    navigate: vi.fn().mockImplementation(() => {
      navigationToLoginInProgress = true;

      return Promise.resolve(true).finally(() => {
        navigationToLoginInProgress = false;
      });
    }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: API_BASE_URL,
          useValue: 'https://api.ironcore.test/api',
        },
        { provide: Router, useValue: router },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authState = TestBed.inject(AuthStateService);
    authState.clear();
    router.url = '/profile';
    navigationToLoginInProgress = false;
    router.currentNavigation.mockClear();
    router.navigate.mockClear();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should send credentials to API requests', () => {
    httpClient.get('https://api.ironcore.test/api/users/me').subscribe();

    const request = httpTestingController.expectOne('https://api.ironcore.test/api/users/me');

    expect(request.request.withCredentials).toBe(true);

    request.flush({});
  });

  it('should not send credentials to external requests', () => {
    httpClient.get('https://telemetry.ironcore.test/events').subscribe();

    const request = httpTestingController.expectOne('https://telemetry.ironcore.test/events');

    expect(request.request.withCredentials).toBe(false);

    request.flush({});
  });

  it('should not send credentials to an origin that only shares the API URL prefix', () => {
    const maliciousUrl = 'https://api.ironcore.test.evil.example/api/users/me';

    httpClient.get(maliciousUrl).subscribe();

    const request = httpTestingController.expectOne(maliciousUrl);

    expect(request.request.withCredentials).toBe(false);

    request.flush({});
  });

  it('should clear the authenticated user without navigating during session restoration', () => {
    authState.setUser({
      userId: 1,
      email: 'renan@ironcore.test',
      nickname: 'Renan',
      mustChangePassword: false,
    });

    httpClient.get('https://api.ironcore.test/api/users/me').subscribe({ error: () => undefined });

    const request = httpTestingController.expectOne('https://api.ironcore.test/api/users/me');
    request.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(authState.isAuthenticated()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should not navigate for unauthorized public authentication requests', () => {
    const publicRequests = [
      { method: 'post', url: 'https://api.ironcore.test/api/auth/login' },
      { method: 'post', url: 'https://api.ironcore.test/api/users/change-initial-password' },
      { method: 'post', url: 'https://api.ironcore.test/api/auth/logout' },
    ] as const;

    for (const publicRequest of publicRequests) {
      httpClient[publicRequest.method](publicRequest.url, {}).subscribe({ error: () => undefined });

      const request = httpTestingController.expectOne(publicRequest.url);
      request.flush(null, { status: 401, statusText: 'Unauthorized' });
    }

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should treat public authentication endpoints as public only for their configured HTTP methods and exact paths', () => {
    httpClient.get('https://api.ironcore.test/api/auth/login').subscribe({ error: () => undefined });

    const request = httpTestingController.expectOne('https://api.ironcore.test/api/auth/login');
    request.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigate).toHaveBeenCalledOnce();
  });

  it('should clear the authenticated user and navigate to login after a protected API request is unauthorized', () => {
    authState.setUser({
      userId: 1,
      email: 'renan@ironcore.test',
      nickname: 'Renan',
      mustChangePassword: false,
    });

    httpClient.get('https://api.ironcore.test/api/users/me/person').subscribe({ error: () => undefined });

    const request = httpTestingController.expectOne('https://api.ironcore.test/api/users/me/person');
    request.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(authState.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should consume navigation failures after a protected API request is unauthorized', async () => {
    router.navigate.mockImplementationOnce(() => Promise.reject(new Error('Navigation failed')));

    httpClient.get('https://api.ironcore.test/api/users/me/person').subscribe({ error: () => undefined });

    const request = httpTestingController.expectOne('https://api.ironcore.test/api/users/me/person');
    request.flush(null, { status: 401, statusText: 'Unauthorized' });

    await Promise.resolve();

    expect(router.navigate).toHaveBeenCalledOnce();
  });

  it('should not clear authentication or navigate after an unauthorized external request', () => {
    authState.setUser({
      userId: 1,
      email: 'renan@ironcore.test',
      nickname: 'Renan',
      mustChangePassword: false,
    });

    httpClient.get('https://telemetry.ironcore.test/events').subscribe({ error: () => undefined });

    const request = httpTestingController.expectOne('https://telemetry.ironcore.test/events');
    request.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(authState.isAuthenticated()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should preserve authentication and propagate forbidden API errors without navigating', () => {
    authState.setUser({
      userId: 1,
      email: 'renan@ironcore.test',
      nickname: 'Renan',
      mustChangePassword: false,
    });
    let receivedStatus: number | undefined;

    httpClient.get('https://api.ironcore.test/api/users/me/person').subscribe({
      error: (error) => {
        receivedStatus = error.status;
      },
    });

    const request = httpTestingController.expectOne('https://api.ironcore.test/api/users/me/person');
    request.flush(null, { status: 403, statusText: 'Forbidden' });

    expect(receivedStatus).toBe(403);
    expect(authState.isAuthenticated()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should avoid duplicate navigation when protected API requests are unauthorized together', () => {
    httpClient.get('https://api.ironcore.test/api/users/me/person').subscribe({ error: () => undefined });
    httpClient.get('https://api.ironcore.test/api/users/me/change-password').subscribe({ error: () => undefined });

    const personRequest = httpTestingController.expectOne('https://api.ironcore.test/api/users/me/person');
    const passwordRequest = httpTestingController.expectOne('https://api.ironcore.test/api/users/me/change-password');

    personRequest.flush(null, { status: 401, statusText: 'Unauthorized' });
    passwordRequest.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigate).toHaveBeenCalledOnce();
  });
});
