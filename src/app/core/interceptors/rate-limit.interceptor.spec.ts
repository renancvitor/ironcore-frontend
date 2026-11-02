import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../http/api-base-url.token';
import { rateLimitInterceptor } from './rate-limit.interceptor';

describe('authentication Retry-After', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([rateLimitInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.ironcore.test' },
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 10, 2));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    requests.verify();
  });
  it.each(['60', new Date(Date.UTC(2026, 10, 2, 0, 1)).toUTCString()])(
    'honors %s without sleeping, retrying, or blocking logout',
    (retry) => {
      const url = 'https://api.ironcore.test/api/auth/login';
      const error = vi.fn();
      http.post(url, {}).subscribe({ error });
      requests
        .expectOne(url)
        .flush({}, { status: 429, statusText: 'Limited', headers: { 'Retry-After': retry } });
      http.post(url, {}).subscribe({ error });
      requests.expectNone(url);
      expect(error).toHaveBeenCalledTimes(2);
      expect(error.mock.calls[1][0].error.message).toContain('60 segundos');
      const logout = 'https://api.ironcore.test/api/auth/logout';
      http.post(logout, {}).subscribe();
      requests.expectOne(logout).flush(null);
      vi.mocked(Date.now).mockReturnValue(Date.UTC(2026, 10, 2, 0, 1));
      http.post(url, {}).subscribe();
      requests.expectOne(url).flush({});
    },
  );
  it('does not invent a prolonged block when Retry-After is invalid', () => {
    const url = 'https://api.ironcore.test/api/auth/refresh';
    http.post(url, {}).subscribe({ error: () => undefined });
    requests
      .expectOne(url)
      .flush({}, { status: 429, statusText: 'Limited', headers: { 'Retry-After': 'invalid' } });
    http.post(url, {}).subscribe();
    requests.expectOne(url).flush({});
  });
  it('leaves unrelated origins outside the cooldown', () => {
    const url = 'https://external.test/api/auth/login';
    http.post(url, {}).subscribe({ error: () => undefined });
    requests
      .expectOne(url)
      .flush({}, { status: 429, statusText: 'Limited', headers: { 'Retry-After': '60' } });
    http.post(url, {}).subscribe();
    requests.expectOne(url).flush({});
  });
});
