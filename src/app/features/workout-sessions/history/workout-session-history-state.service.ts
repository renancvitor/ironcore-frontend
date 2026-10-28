import { effect, inject, Injectable } from '@angular/core';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { WorkoutSessionHistoryFilters } from '../workout-sessions.models';

@Injectable({ providedIn: 'root' })
export class WorkoutSessionHistoryState {
  filters: WorkoutSessionHistoryFilters = {};
  page = 0;
  size = 20;

  constructor() {
    const auth = inject(AuthStateService);
    let userId = auth.currentUser()?.userId ?? null;
    effect(() => {
      const nextUserId = auth.currentUser()?.userId ?? null;
      if (nextUserId === userId) return;
      userId = nextUserId;
      this.filters = {};
      this.page = 0;
      this.size = 20;
    });
  }
}
