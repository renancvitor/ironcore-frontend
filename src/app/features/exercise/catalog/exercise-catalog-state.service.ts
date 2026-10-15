import { Injectable } from '@angular/core';
import { ListExercisesRequest } from '../exercise.models';

@Injectable({ providedIn: 'root' })
export class ExerciseCatalogStateService {
  filters: ListExercisesRequest = {};
  page = 0;
  size = 20;
}
