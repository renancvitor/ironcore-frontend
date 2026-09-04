import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthStateService } from '../auth/auth-state.service';
import { API_BASE_URL } from '../http/api-base-url.token';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let authState: AuthStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: API_BASE_URL,
          useValue: 'https://api.ironcore.test/api',
        },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authState = TestBed.inject(AuthStateService);
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

  it('should clear the authenticated user after an unauthorized response', () => {
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
  });
});
