import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  defer,
  finalize,
  firstValueFrom,
  Observable,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { API_BASE_URL } from '../http/api-base-url.token';
import { AuthStateService } from './auth-state.service';
import { AuthenticatedUser, RefreshResponse } from './auth.models';
import { CsrfService } from './csrf.service';

export const SKIP_SESSION_RECOVERY = new HttpContextToken(() => false);

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly state = inject(AuthStateService);
  private readonly csrf = inject(CsrfService);
  private readonly router = inject(Router);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly lockName = 'ironcore-session:' + this.apiBaseUrl;
  private readonly channel =
    typeof this.window?.BroadcastChannel === 'function'
      ? new this.window.BroadcastChannel(this.lockName)
      : undefined;
  private pending?: Observable<AuthenticatedUser>;
  private refreshUncertain: string | null = null;
  private readonly refreshUncertainties = new Set<string>();
  private version = 0;

  get revision(): number {
    return this.version;
  }

  constructor() {
    if (this.channel) {
      this.channel.onmessage = ({ data }) => {
        if (data?.type === 'refresh-uncertain' && typeof data.id === 'string') {
          this.refreshUncertainties.add(data.id);
          return;
        }
        if (data?.type === 'refreshed' && Array.isArray(data.uncertainties)) {
          for (const id of data.uncertainties) {
            this.refreshUncertainties.delete(id);
            if (id === this.refreshUncertain) this.refreshUncertain = null;
          }
          return;
        }
        if (data !== 'logout' && data !== 'changed') return;
        const previousUserId = this.state.currentUser()?.userId;
        const revision = ++this.version;
        this.csrf.invalidate();
        this.state.clear();
        if (data === 'logout') {
          this.navigateToLogin();
        } else {
          this.refreshUncertain = null;
          this.probe().subscribe({
            next: (user) => {
              if (revision !== this.version) return;
              if (previousUserId !== undefined && previousUserId !== user.userId) {
                this.window?.location.replace('/');
                return;
              }
              this.state.setUser(user);
            },
            error: () => {
              if (revision === this.version) this.navigateToLogin();
            },
          });
        }
      };
    }
    inject(DestroyRef).onDestroy(() => this.channel?.close());
  }

  mutate<T>(operation: () => Observable<T>, event: 'changed' | 'logout'): Observable<T> {
    return defer(() => {
      ++this.version;
      return this.exclusive(operation).pipe(
        tap(() => {
          this.refreshUncertain = null;
          this.csrf.invalidate();
          this.channel?.postMessage(event);
        }),
      );
    });
  }

  recover(): Observable<AuthenticatedUser> {
    this.pending ??= defer(() => {
      const revision = this.version;
      return this.exclusive(() => {
        this.assertCurrent(revision);
        return this.probe().pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status !== 401) return throwError(() => error);
            this.assertCurrent(revision);
            if (!this.window?.navigator.locks || this.refreshUncertain)
              return throwError(() => error);
            return this.http
              .post<RefreshResponse>(
                this.apiBaseUrl + '/api/auth/refresh',
                {},
                {
                  context: new HttpContext().set(SKIP_SESSION_RECOVERY, true),
                  withCredentials: true,
                },
              )
              .pipe(
                catchError((failure: HttpErrorResponse) => {
                  if (failure.status === 0 || failure.status >= 500) {
                    this.refreshUncertain = crypto.randomUUID();
                    this.refreshUncertainties.add(this.refreshUncertain);
                    this.channel?.postMessage({
                      type: 'refresh-uncertain',
                      id: this.refreshUncertain,
                    });
                  }
                  return throwError(() => failure);
                }),
                tap(() => {
                  this.channel?.postMessage({
                    type: 'refreshed',
                    uncertainties: [...this.refreshUncertainties],
                  });
                  this.refreshUncertainties.clear();
                }),
                switchMap(() => this.probe()),
              );
          }),
        );
      }).pipe(
        tap((user) => {
          this.assertCurrent(revision);
          this.state.setUser(user);
        }),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401 && revision === this.version) this.state.clear();
          return throwError(() => error);
        }),
      );
    }).pipe(
      finalize(() => {
        this.pending = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.pending;
  }

  assertCurrent(revision: number): void {
    if (revision !== this.version) {
      throw new HttpErrorResponse({
        status: 409,
        error: { message: 'A sessão mudou. Confira sua conta antes de repetir a operação.' },
      });
    }
  }

  expire(revision: number): void {
    if (revision === this.version) this.state.clear();
  }

  private probe(): Observable<AuthenticatedUser> {
    return this.http.get<AuthenticatedUser>(this.apiBaseUrl + '/api/users/me', {
      context: new HttpContext().set(SKIP_SESSION_RECOVERY, true),
      withCredentials: true,
    });
  }

  private exclusive<T>(operation: () => Observable<T>): Observable<T> {
    const locks = this.window?.navigator.locks;
    return locks
      ? defer(async () => await locks.request(this.lockName, () => firstValueFrom(operation())))
      : defer(operation);
  }

  private navigateToLogin(): void {
    void this.router.navigate(['/login']).catch(() => undefined);
  }
}
