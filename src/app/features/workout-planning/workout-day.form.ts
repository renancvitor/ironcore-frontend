import { FormControl, FormGroup, Validators } from '@angular/forms';
import { WEEK_DAY_LABELS } from './workout-planning.labels';
import { WeekDay, WorkoutDayDetailResponse } from './workout-planning.models';

export function createWorkoutDayForm(
  mode: 'create' | 'edit' | 'reorder',
  days: () => readonly WorkoutDayDetailResponse[],
  dayId: number | null = null,
) {
  const weekDay = new FormControl<WeekDay>('SUNDAY', {
    nonNullable: true,
    validators:
      mode === 'edit'
        ? []
        : [
            Validators.required,
            (control) =>
              Object.keys(WEEK_DAY_LABELS).includes(control.value) ? null : { weekDay: true },
          ],
  });
  return new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators:
        mode === 'reorder'
          ? []
          : [Validators.required, (control) => (control.value.trim() ? null : { required: true })],
    }),
    weekDay,
    sortOrder: new FormControl(1, {
      nonNullable: true,
      validators:
        mode !== 'reorder'
          ? []
          : [
              Validators.required,
              Validators.min(1),
              (control) => {
                const count = days().filter(
                  (day) => day.weekDay === weekDay.value && day.id !== dayId,
                ).length;
                return Number.isInteger(control.value) && control.value <= count + 1
                  ? null
                  : { position: true };
              },
            ],
    }),
  });
}

export type WorkoutDayForm = ReturnType<typeof createWorkoutDayForm>;
