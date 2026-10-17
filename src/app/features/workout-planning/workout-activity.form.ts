import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import {
  UpdateWorkoutActivityRequest,
  WorkoutActivityDetailResponse,
} from './workout-planning.models';

export function createWorkoutActivityForm(activity?: WorkoutActivityDetailResponse) {
  const positive: ValidatorFn = (control) =>
    control.value === null || (Number.isFinite(control.value) && control.value > 0)
      ? null
      : { positive: true };
  const integer: ValidatorFn = (control) =>
    control.value === null || Number.isInteger(control.value) ? null : { integer: true };
  return new FormGroup(
    {
      sets: new FormControl<number | null>(activity?.sets ?? null, [positive, integer]),
      repRangeMin: new FormControl<number | null>(activity?.repRangeMin ?? null, [
        positive,
        integer,
      ]),
      repRangeMax: new FormControl<number | null>(activity?.repRangeMax ?? null, [
        positive,
        integer,
      ]),
      targetLoadKg: new FormControl<number | null>(activity?.targetLoadKg ?? null, positive),
      targetLoadText: new FormControl(activity?.targetLoadText ?? '', { nonNullable: true }),
      durationMinutes: new FormControl<number | null>(activity?.durationMinutes ?? null, [
        positive,
        integer,
      ]),
      distanceKm: new FormControl<number | null>(activity?.distanceKm ?? null, positive),
      intensityText: new FormControl(activity?.intensityText ?? '', { nonNullable: true }),
      restSeconds: new FormControl<number | null>(activity?.restSeconds ?? null, [
        positive,
        integer,
      ]),
      notes: new FormControl(activity?.notes ?? '', { nonNullable: true }),
    },
    {
      validators: (group) => {
        const { repRangeMin, repRangeMax } = group.getRawValue();
        return repRangeMin !== null && repRangeMax !== null && repRangeMin > repRangeMax
          ? { repRange: true }
          : null;
      },
    },
  );
}

export type WorkoutActivityForm = ReturnType<typeof createWorkoutActivityForm>;

export function buildWorkoutActivityRequest(
  form: WorkoutActivityForm,
  exerciseId: number,
): UpdateWorkoutActivityRequest {
  const value = form.getRawValue();
  return {
    ...value,
    exerciseId,
    targetLoadText: value.targetLoadText.trim() || null,
    intensityText: value.intensityText.trim() || null,
    notes: value.notes.trim() || null,
  };
}

export function createWorkoutActivityOrderForm(count: number, position = 1) {
  return new FormGroup({
    orderIndex: new FormControl(position, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(1),
        Validators.max(count),
        (control) => (Number.isInteger(control.value) ? null : { integer: true }),
      ],
    }),
  });
}

export type WorkoutActivityOrderForm = ReturnType<typeof createWorkoutActivityOrderForm>;
