import { Injectable } from '@angular/core';
import { ListWorkoutCyclesRequest } from '../workout-planning.models';

@Injectable({ providedIn: 'root' })
export class WorkoutCycleCatalogStateService {
  filters: ListWorkoutCyclesRequest = {};
  page = 0;
  size = 20;
}
