import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { finalize, Observable, shareReplay } from 'rxjs';

import { API_BASE_URL } from '../http/api-base-url.token';

interface CsrfToken {
  headerName: string;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class CsrfService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private pending?: Observable<CsrfToken>;

  getToken(): Observable<CsrfToken> {
    this.pending ??= this.http
      .get<CsrfToken>(`${this.apiBaseUrl}/api/auth/csrf`, {
        withCredentials: true,
      })
      .pipe(
        finalize(() => {
          this.pending = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.pending;
  }
}
