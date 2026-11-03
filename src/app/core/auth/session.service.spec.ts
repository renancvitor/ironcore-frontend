import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../http/api-base-url.token';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { csrfInterceptor } from '../interceptors/csrf.interceptor';
import { rateLimitInterceptor } from '../interceptors/rate-limit.interceptor';
import { AuthStateService } from './auth-state.service';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { ProfileService } from '../../features/profile/profile.service';

class TestBroadcastChannel {
  static channels: TestBroadcastChannel[] = [];
  static messages: unknown[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  constructor(readonly name: string) {
    TestBroadcastChannel.channels.push(this);
  }
  postMessage(data: unknown): void {
    TestBroadcastChannel.messages.push(data);
    for (const channel of TestBroadcastChannel.channels) {
      if (channel !== this && channel.name === this.name) {
        queueMicrotask(() => channel.onmessage?.({ data }));
      }
    }
  }
  close(): void {
    this.onmessage = null;
  }
}

describe('session recovery with cookie rotation', () => {
  const api = 'https://api.ironcore.test';
  const user = { userId: 1, email: 'user@test.local', nickname: 'User', mustChangePassword: false };
  let http: HttpClient;
  let requests: HttpTestingController;
  let state: AuthStateService;
  let session: SessionService;
  let originalLocks: PropertyDescriptor | undefined;
  let originalChannel: PropertyDescriptor | undefined;
  const router = {
    url: '/profile',
    currentNavigation: () => null,
    navigate: vi.fn(() => Promise.resolve(true)),
  };
  const tick = async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  };
  function csrf() {
    requests
      .expectOne(api + '/api/auth/csrf')
      .flush({ headerName: 'X-XSRF-TOKEN', token: 'csrf-test' });
  }
  function denied(url: string, status = 401) {
    requests.expectOne(api + url).flush({}, { status, statusText: 'Rejected' });
  }
  function expiredProbe() {
    denied('/api/users/me');
    csrf();
  }
  function rotated() {
    const refresh = requests.expectOne(api + '/api/auth/refresh');
    expect(refresh.request.withCredentials).toBe(true);
    expect(refresh.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-test');
    refresh.flush({ expiresAt: '2026-11-02T23:00:00Z' });
    requests.expectOne(api + '/api/users/me').flush(user);
  }
  beforeEach(() => {
    originalChannel = Object.getOwnPropertyDescriptor(window, 'BroadcastChannel');
    TestBroadcastChannel.channels = [];
    TestBroadcastChannel.messages = [];
    Object.defineProperty(window, 'BroadcastChannel', {
      configurable: true,
      value: TestBroadcastChannel,
    });
    let tail = Promise.resolve();
    originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks');
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: (_name: string, callback: () => Promise<unknown>) => {
          const result = tail.then(callback);
          tail = result.then(
            () => undefined,
            () => undefined,
          );
          return result;
        },
      },
    });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([rateLimitInterceptor, authInterceptor, csrfInterceptor]),
        ),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: api },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    state = TestBed.inject(AuthStateService);
    session = TestBed.inject(SessionService);
    state.setUser(user);
    router.navigate.mockClear();
  });
  afterEach(() => {
    if (originalLocks) Object.defineProperty(navigator, 'locks', originalLocks);
    else Reflect.deleteProperty(navigator, 'locks');
    if (originalChannel) Object.defineProperty(window, 'BroadcastChannel', originalChannel);
    else Reflect.deleteProperty(window, 'BroadcastChannel');
    requests.verify();
  });

  it('shares one rotation for concurrent requests and retries each read once', async () => {
    const received = vi.fn();
    for (const path of ['/api/one', '/api/two']) http.get(api + path).subscribe(received);
    denied('/api/one');
    denied('/api/two');
    await tick();
    expiredProbe();
    rotated();
    await tick();
    for (const path of ['/api/one', '/api/two']) requests.expectOne(api + path).flush({ ok: true });
    expect(received).toHaveBeenCalledTimes(2);
    expect(state.currentUser()).toEqual(user);
  });

  it('rechecks cookies after another tab finishes rotation under the shared lock', async () => {
    const secondTab = TestBed.runInInjectionContext(() => new SessionService());
    const first = vi.fn(),
      second = vi.fn();
    session.recover().subscribe(first);
    secondTab.recover().subscribe(second);
    await tick();
    expiredProbe();
    rotated();
    await tick();
    requests.expectOne(api + '/api/users/me').flush(user);
    await tick();
    expect(first).toHaveBeenCalledWith(user);
    expect(second).toHaveBeenCalledWith(user);
    requests.expectNone(api + '/api/auth/refresh');
  });

  it('renews an expired session without replaying a mutation', async () => {
    const error = vi.fn();
    http.post(api + '/api/workouts', { name: 'New' }).subscribe({ error });
    csrf();
    denied('/api/workouts');
    await tick();
    expiredProbe();
    rotated();
    await tick();
    expect(error.mock.calls[0][0].status).toBe(401);
    expect(error.mock.calls[0][0].error.message).toContain('Repita');
    requests.expectNone(api + '/api/workouts');
    expect(state.isAuthenticated()).toBe(true);
  });

  it('releases the password change lock before checking a wrong current password', async () => {
    const error = vi.fn();
    TestBed.inject(ProfileService)
      .changePassword({
        currentPassword: 'wrong-password',
        newPassword: 'next-password',
        confirmNewPassword: 'next-password',
      })
      .subscribe({ error });
    await tick();
    csrf();
    denied('/api/users/me/change-password');
    await tick();
    requests.expectOne(api + '/api/users/me').flush(user);
    await tick();
    expect(error.mock.calls[0][0].status).toBe(401);
    expect(state.isAuthenticated()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
    requests.expectNone(api + '/api/auth/refresh');
    requests.expectNone(api + '/api/users/me/change-password');
  });

  it.each([403, 429, 500, 0])(
    'preserves session state after refresh failure %s without a retry loop',
    async (status) => {
      const error = vi.fn();
      session.recover().subscribe({ error });
      await tick();
      expiredProbe();
      const request = requests.expectOne(api + '/api/auth/refresh');
      if (status === 0) request.error(new ProgressEvent('error'));
      else request.flush({}, { status, statusText: 'Rejected' });
      await tick();
      expect(error.mock.calls[0][0].status).toBe(status);
      expect(state.isAuthenticated()).toBe(true);
      if (status === 500 || status === 0) {
        session.recover().subscribe({ error });
        await tick();
        denied('/api/users/me');
        await tick();
        requests.expectNone(api + '/api/auth/refresh');
        expect(state.isAuthenticated()).toBe(false);
      }
    },
  );

  async function uncertain(status: number) {
    session.recover().subscribe({ error: () => undefined });
    await tick();
    expiredProbe();
    const refresh = requests.expectOne(api + '/api/auth/refresh');
    if (status === 0) refresh.error(new ProgressEvent('error'));
    else refresh.flush({}, { status, statusText: 'Unavailable' });
    await tick();
  }

  it.each([0, 503])(
    'restores refresh capability only after another tab confirms rotation following %s',
    async (status) => {
      const other = TestBed.runInInjectionContext(() => new SessionService());
      await uncertain(status);
      other.recover().subscribe();
      await tick();
      expiredProbe();
      rotated();
      await tick();
      const received = vi.fn();
      session.recover().subscribe(received);
      await tick();
      expiredProbe();
      rotated();
      await tick();
      expect(received).toHaveBeenCalledWith(user);
      expect(router.navigate).not.toHaveBeenCalled();
    },
  );

  it.each([0, 503])(
    'does not release uncertainty %s after a successful me response alone',
    async (status) => {
      await uncertain(status);
      session.recover().subscribe();
      await tick();
      requests.expectOne(api + '/api/users/me').flush(user);
      await tick();
      session.recover().subscribe({ error: () => undefined });
      await tick();
      denied('/api/users/me');
      await tick();
      requests.expectNone(api + '/api/auth/refresh');
      expect(state.isAuthenticated()).toBe(false);
    },
  );

  it('does not confirm rotation when the other tab also fails', async () => {
    const other = TestBed.runInInjectionContext(() => new SessionService());
    await uncertain(0);
    other.recover().subscribe({ error: () => undefined });
    await tick();
    expiredProbe();
    denied('/api/auth/refresh', 503);
    await tick();
    session.recover().subscribe({ error: () => undefined });
    await tick();
    denied('/api/users/me');
    await tick();
    requests.expectNone(api + '/api/auth/refresh');
    expect(TestBroadcastChannel.messages).not.toContainEqual(
      expect.objectContaining({ type: 'refreshed' }),
    );
  });

  it('does not let a delayed confirmation release a subsequent unknown refresh', async () => {
    const other = TestBed.runInInjectionContext(() => new SessionService());
    await uncertain(0);
    other.recover().subscribe();
    await tick();
    expiredProbe();
    rotated();
    await tick();
    const previous = TestBroadcastChannel.messages.find(
      (message) => (message as { type: string }).type === 'refreshed',
    );
    await uncertain(503);
    TestBroadcastChannel.channels[0].onmessage?.({ data: previous });
    session.recover().subscribe({ error: () => undefined });
    await tick();
    denied('/api/users/me');
    await tick();
    requests.expectNone(api + '/api/auth/refresh');
  });

  it('still requires authentication if the new refresh credential is revoked', async () => {
    const other = TestBed.runInInjectionContext(() => new SessionService());
    await uncertain(0);
    other.recover().subscribe();
    await tick();
    expiredProbe();
    rotated();
    await tick();
    http.get(api + '/api/private').subscribe({ error: () => undefined });
    denied('/api/private');
    await tick();
    expiredProbe();
    denied('/api/auth/refresh');
    await tick();
    expect(state.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    requests.expectNone(api + '/api/auth/refresh');
  });

  it('clears revoked sessions and does not try refresh again recursively', async () => {
    http.get(api + '/api/private').subscribe({ error: () => undefined });
    denied('/api/private');
    await tick();
    expiredProbe();
    denied('/api/auth/refresh');
    await tick();
    expect(state.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('stops after an unauthorized read retry', async () => {
    http.get(api + '/api/private').subscribe({ error: () => undefined });
    denied('/api/private');
    await tick();
    expiredProbe();
    rotated();
    await tick();
    denied('/api/private');
    expect(state.isAuthenticated()).toBe(false);
    requests.expectNone(api + '/api/auth/refresh');
  });

  it('rejects a stale read after logout and cannot restore the old user', async () => {
    const error = vi.fn();
    TestBed.inject(AuthService).restoreSession().subscribe({ error });
    const stale = requests.expectOne(api + '/api/users/me');
    TestBed.inject(AuthService).logout().subscribe();
    await tick();
    csrf();
    requests.expectOne(api + '/api/auth/logout').flush(null);
    await tick();
    stale.flush(user);
    expect(state.isAuthenticated()).toBe(false);
    expect(error.mock.calls[0][0].status).toBe(409);
  });

  it('keeps logout available during authentication cooldown and preserves state if logout fails', async () => {
    http.post(api + '/api/auth/login', {}).subscribe({ error: () => undefined });
    csrf();
    requests
      .expectOne(api + '/api/auth/login')
      .flush({}, { status: 429, statusText: 'Limited', headers: { 'Retry-After': '60' } });
    TestBed.inject(AuthService)
      .logout()
      .subscribe({ error: () => undefined });
    await tick();
    csrf();
    denied('/api/auth/logout', 503);
    await tick();
    expect(state.isAuthenticated()).toBe(true);
    TestBed.inject(AuthService).logout().subscribe();
    await tick();
    csrf();
    requests.expectOne(api + '/api/auth/logout').flush(null);
    await tick();
    expect(state.isAuthenticated()).toBe(false);
  });

  it('ignores a late unauthorized retry after a new login', async () => {
    const error = vi.fn();
    http.get(api + '/api/private').subscribe({ error });
    denied('/api/private');
    await tick();
    expiredProbe();
    rotated();
    await tick();
    const stale = requests.expectOne(api + '/api/private');
    TestBed.inject(AuthService)
      .login({ email: 'second@test.local', password: 'next-password' })
      .subscribe();
    await tick();
    csrf();
    const secondUser = { ...user, userId: 2, email: 'second@test.local' };
    requests
      .expectOne(api + '/api/auth/login')
      .flush({ ...secondUser, expiresAt: '2026-11-03T00:00:00Z' });
    await tick();
    stale.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(state.currentUser()).toEqual(secondUser);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledOnce();
    requests.expectNone(api + '/api/auth/refresh');
  });

  it('redirects after a revoked session prevents a password change without replaying it', async () => {
    const error = vi.fn();
    TestBed.inject(ProfileService)
      .changePassword({
        currentPassword: 'old-password',
        newPassword: 'next-password',
        confirmNewPassword: 'next-password',
      })
      .subscribe({ error });
    await tick();
    csrf();
    denied('/api/users/me/change-password');
    await tick();
    expiredProbe();
    denied('/api/auth/refresh');
    await tick();
    expect(state.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    requests.expectNone(api + '/api/users/me/change-password');
  });

  it('does not rotate without cross-tab lock support', async () => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
    session.recover().subscribe({ error: () => undefined });
    denied('/api/users/me');
    requests.expectNone(api + '/api/auth/refresh');
    expect(state.isAuthenticated()).toBe(false);
  });
});
