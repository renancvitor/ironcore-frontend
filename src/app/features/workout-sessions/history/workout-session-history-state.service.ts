import { Injectable } from '@angular/core';
import { WorkoutSessionHistoryFilters } from '../workout-sessions.models';

@Injectable({ providedIn: 'root' })
export class WorkoutSessionHistoryState {
  filters: WorkoutSessionHistoryFilters = {};
  page = 0;
  size = 20;
  selectedCycle: { id: number; name: string } | null = null;
}
