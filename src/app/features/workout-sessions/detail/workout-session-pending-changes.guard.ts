import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CanActivateFn, CanDeactivateFn, NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { catchError, defaultIfEmpty, Observable, of, shareReplay, take, tap } from 'rxjs';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import type { WorkoutSessionDetailComponent } from './workout-session-detail.component';

// Entry guards also run on parameter changes, before the reused component receives paramMap.
@Injectable({ providedIn: 'root' })
export class WorkoutSessionNavigation {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStateService);
  private owner: object | null = null;
  private leave: (() => Observable<boolean>) | null = null;
  private approval: { id: number; url: string; result: Observable<boolean>; accepted: boolean } | null = null;
  readonly pending = signal(false);

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.pending.set(false);
      }
    });
  }

  register(owner: object, leave: () => Observable<boolean>): void {
    this.owner = owner;
    this.leave = leave;
    this.approval = null;
  }

  unregister(owner: object): void {
    if (this.owner !== owner) return;
    this.owner = null;
    this.leave = null;
    this.approval = null;
  }

  check(url: string): Observable<boolean> {
    if (url.split(/[?#]/)[0] === '/login' && !this.auth.isAuthenticated()) return of(true);
    if (!this.leave) return of(true);
    const id = this.router.currentNavigation()?.id ?? -1;
    if (this.approval?.id === id && this.approval.url === url) return this.approval.result;
    this.pending.set(true);
    const approval = { id, url, accepted: false, result: of(false) as Observable<boolean> };
    approval.result = this.leave().pipe(take(1), defaultIfEmpty(false), catchError(() => of(false)),
      tap((accepted) => { approval.accepted = accepted; }), shareReplay({ bufferSize: 1, refCount: false }));
    this.approval = approval;
    return approval.result;
  }

  approvedFor(rawId: string | null): boolean {
    const target = rawId === null ? '/workout-sessions' : `/workout-sessions/${rawId}`;
    return this.approval?.accepted === true &&
      this.approval.id === this.router.currentNavigation()?.id &&
      this.approval.url.split(/[?#]/)[0] === target;
  }
}

export const workoutSessionEntryGuard: CanActivateFn = (_route, state) =>
  inject(WorkoutSessionNavigation).check(state.url);

export const workoutSessionPendingChangesGuard: CanDeactivateFn<WorkoutSessionDetailComponent> =
  (_component, _route, _state, next) => inject(WorkoutSessionNavigation).check(next.url);
