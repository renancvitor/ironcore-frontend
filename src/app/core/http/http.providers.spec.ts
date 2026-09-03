import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from './api-base-url.token';
import { provideCoreHttp } from './http.providers';

describe('provideCoreHttp', () => {
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideCoreHttp(), provideHttpClientTesting()],
    });

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should provide HttpClient', () => {
    const httpClient = TestBed.inject(HttpClient);

    expect(httpClient).toBeTruthy();
  });

  it('should provide API base URL', () => {
    const apiBaseUrl = TestBed.inject(API_BASE_URL);

    expect(apiBaseUrl).toBeTruthy();
  });

  it('should perform request using API base URL', () => {
    const httpClient = TestBed.inject(HttpClient);
    const apiBaseUrl = TestBed.inject(API_BASE_URL);

    httpClient.get(`${apiBaseUrl}/test`).subscribe();

    const request = httpTestingController.expectOne(`${apiBaseUrl}/test`);

    expect(request.request.method).toBe('GET');

    request.flush({});
  });
});
