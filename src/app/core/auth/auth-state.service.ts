import { Injectable, computed, signal } from '@angular/core';

import { AuthenticatedUser } from './auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  private readonly currentUserState = signal<AuthenticatedUser | null>(null);

  readonly currentUser = this.currentUserState.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserState() !== null);

  setUser(user: AuthenticatedUser): void {
    this.currentUserState.set(user);
  }

  clear(): void {
    this.currentUserState.set(null);
  }
}
