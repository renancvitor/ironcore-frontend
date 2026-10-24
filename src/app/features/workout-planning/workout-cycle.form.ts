import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  CreateWorkoutCycleRequest,
  TrainingGoalResponse,
  WeekDay,
} from './workout-planning.models';

export function createWorkoutCycleForm(goals: () => readonly TrainingGoalResponse[]) {
  return new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        (control) => (control.value.trim() ? null : { required: true }),
      ],
    }),
    trainingGoalId: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      (control) =>
        goals().some((goal) => goal.id === control.value) ? null : { unavailable: true },
    ]),
    desiredDurationMonths: new FormControl<number | null>(null, [
      Validators.min(1),
      (control) =>
        control.value === null || Number.isInteger(control.value) ? null : { integer: true },
    ]),
    weekStartsOn: new FormControl<WeekDay>('SUNDAY', {
      nonNullable: true,
    }),
    notes: new FormControl('', { nonNullable: true }),
  });
}

export type WorkoutCycleForm = ReturnType<typeof createWorkoutCycleForm>;

export function buildWorkoutCycleRequest(form: WorkoutCycleForm): CreateWorkoutCycleRequest {
  const value = form.getRawValue();
  return {
    name: value.name.trim(),
    trainingGoalId: value.trainingGoalId!,
    desiredDurationMonths: value.desiredDurationMonths,
    weekStartsOn: value.weekStartsOn,
    notes: value.notes || null,
  };
}
