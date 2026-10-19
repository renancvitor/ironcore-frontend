import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AuthStateService } from '../auth/auth-state.service';
import { API_BASE_URL } from '../http/api-base-url.token';
import { authInterceptor } from './auth.interceptor';
import { csrfInterceptor } from './csrf.interceptor';

describe('cross-origin CSRF integration', () => {
  const api = 'https://api.ironcore.test';
  const user = { userId: 1, email: 'user@ironcore.test', nickname: 'User', mustChangePassword: false };
  let http: HttpClient;
  let requests: HttpTestingController;
  let auth: AuthService;
  let state: AuthStateService;
  const router = { url: '/profile', currentNavigation: vi.fn(() => null), navigate: vi.fn() };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor, csrfInterceptor])),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: api },
      { provide: Router, useValue: router },
    ] });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    state = TestBed.inject(AuthStateService);
    router.navigate.mockClear();
  });

  afterEach(() => requests.verify());

  function supplyToken(token = 'masked-token') {
    const request = requests.expectOne(`${api}/api/auth/csrf`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ headerName: 'X-XSRF-TOKEN', token });
  }

  it('protects login, first access, authenticated writes and logout, fetching fresh tokens', () => {
    auth.initialChangePassword({ email: user.email, currentPassword: 'old', newPassword: 'new', confirmNewPassword: 'new' }).subscribe();
    supplyToken('initial-token');
    const initial = requests.expectOne(`${api}/api/users/change-initial-password`);
    expect(initial.request.headers.get('X-XSRF-TOKEN')).toBe('initial-token');
    initial.flush(null);

    auth.login({ email: user.email, password: 'new' }).subscribe();
    supplyToken('login-token');
    const login = requests.expectOne(`${api}/api/auth/login`);
    expect(login.request.headers.get('X-XSRF-TOKEN')).toBe('login-token');
    expect(login.request.withCredentials).toBe(true);
    login.flush(user);
    expect(state.currentUser()).toEqual(user);

    http.put(`${api}/api/users/me/change-nickname`, { nickname: 'Updated' }).subscribe();
    supplyToken('after-login-token');
    const update = requests.expectOne(`${api}/api/users/me/change-nickname`);
    expect(update.request.headers.get('X-XSRF-TOKEN')).toBe('after-login-token');
    update.flush({});

    auth.logout().subscribe();
    supplyToken('logout-token');
    const logout = requests.expectOne(`${api}/api/auth/logout`);
    expect(logout.request.headers.get('X-XSRF-TOKEN')).toBe('logout-token');
    logout.flush(null);
    expect(state.currentUser()).toBeNull();

    auth.login({ email: user.email, password: 'new' }).subscribe();
    supplyToken('after-logout-token');
    const relogin = requests.expectOne(`${api}/api/auth/login`);
    expect(relogin.request.headers.get('X-XSRF-TOKEN')).toBe('after-logout-token');
    relogin.flush(user);
  });

  it('restores a session without requiring CSRF and preserves unauthenticated restoration', () => {
    auth.restoreSession().subscribe();
    const restore = requests.expectOne(`${api}/api/users/me`);
    expect(restore.request.withCredentials).toBe(true);
    expect(restore.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    restore.flush(user);
    expect(state.currentUser()).toEqual(user);
    auth.restoreSession().subscribe();
    requests.expectOne(`${api}/api/users/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(state.currentUser()).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shares CSRF bootstrap for concurrent writes', () => {
    http.post(`${api}/api/one`, {}).subscribe();
    http.delete(`${api}/api/two`).subscribe();
    supplyToken();
    for (const path of ['one', 'two']) {
      const request = requests.expectOne(`${api}/api/${path}`);
      expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('masked-token');
      request.flush({});
    }
  });

  it('does not send CSRF tokens or credentials to unrelated origins', () => {
    for (const url of ['https://telemetry.test/events', 'https://api.ironcore.test.evil.test/api/users']) {
      http.post(url, {}).subscribe();
      const request = requests.expectOne(url);
      expect(request.request.withCredentials).toBe(false);
      expect(request.request.headers.has('X-XSRF-TOKEN')).toBe(false);
      request.flush({});
    }
    requests.expectNone(`${api}/api/auth/csrf`);
  });

  it('does not execute a write if token retrieval fails and can fetch again', () => {
    let status: number | undefined;
    http.post(`${api}/api/write`, {}).subscribe({ error: error => { status = error.status; } });
    requests.expectOne(`${api}/api/auth/csrf`).flush(null, { status: 503, statusText: 'Unavailable' });
    expect(status).toBe(503);
    requests.expectNone(`${api}/api/write`);
    http.post(`${api}/api/write`, {}).subscribe();
    supplyToken();
    requests.expectOne(`${api}/api/write`).flush({});
  });

  it('propagates CSRF rejection without replaying the write or clearing the session', () => {
    state.setUser(user);
    let status: number | undefined;
    http.patch(`${api}/api/write`, {}).subscribe({ error: error => { status = error.status; } });
    supplyToken();
    requests.expectOne(`${api}/api/write`).flush(null, { status: 403, statusText: 'Forbidden' });
    expect(status).toBe(403);
    expect(state.currentUser()).toEqual(user);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
