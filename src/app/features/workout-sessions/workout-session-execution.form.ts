import { AbstractControl, FormControl, FormGroup, ValidatorFn } from '@angular/forms';
import { ActualLoadMode, UpdateWorkoutSessionSetRequest } from './workout-sessions.models';

export const optionalExecutionInteger: ValidatorFn = (control) => {
  const value: unknown = control.value;
  return value === null || (typeof value === 'number' && Number.isInteger(value) &&
    value > 0 && value <= 2147483647) ? null : { executionInteger: true };
};

export const optionalExecutionDecimal: ValidatorFn = (control) => {
  const value: unknown = control.value;
  return value === null || (typeof value === 'number' && Number.isFinite(value) &&
    value >= 0 && value <= 999999.99 && /^\d+(\.\d{1,2})?$/.test(String(value)))
    ? null : { executionDecimal: true };
};

export function executionNotes(value: string | null): string | null {
  return value?.trim() || null;
}

export interface SetExecutionValues {
  actualLoadKg: number | null;
  actualReps: number | null;
  notes: string | null;
}

export interface ActivityExecutionValues {
  actualDurationMinutes: number | null;
  actualDistanceKm: number | null;
  notes: string | null;
}

export function createSessionSetForm(value?: SetExecutionValues) {
  return new FormGroup({
    actualLoadKg: new FormControl<number | null>(value?.actualLoadKg ?? null, optionalExecutionDecimal),
    actualReps: new FormControl<number | null>(value?.actualReps ?? null, optionalExecutionInteger),
    notes: new FormControl(value?.notes ?? '', { nonNullable: true }),
  });
}

export function createSessionActivityForm(value?: ActivityExecutionValues) {
  return new FormGroup({
    actualDurationMinutes: new FormControl<number | null>(value?.actualDurationMinutes ?? null, optionalExecutionInteger),
    actualDistanceKm: new FormControl<number | null>(value?.actualDistanceKm ?? null, optionalExecutionDecimal),
    notes: new FormControl(value?.notes ?? '', { nonNullable: true }),
  });
}

export type SessionSetForm = ReturnType<typeof createSessionSetForm>;
export type SessionActivityForm = ReturnType<typeof createSessionActivityForm>;

export function setExecutionValue(form: SessionSetForm): SetExecutionValues {
  return { ...form.getRawValue(), notes: executionNotes(form.controls.notes.value) };
}

export function activityExecutionValue(form: SessionActivityForm): ActivityExecutionValues {
  return { ...form.getRawValue(), notes: executionNotes(form.controls.notes.value) };
}

export function executionChanges<T extends object>(current: T, baseline: T): Partial<T> {
  const patch: Partial<T> = {};
  for (const key of Object.keys(current) as (keyof T)[]) {
    if (current[key] !== baseline[key]) patch[key] = current[key];
  }
  return patch;
}

export function hasSetExecution(value: SetExecutionValues): boolean {
  return value.actualLoadKg !== null || value.actualReps !== null || executionNotes(value.notes) !== null;
}

export function buildSessionSetPatch(
  current: SetExecutionValues, baseline: SetExecutionValues, mode: ActualLoadMode | null,
): UpdateWorkoutSessionSetRequest {
  const patch: UpdateWorkoutSessionSetRequest = executionChanges(current, baseline);
  if (current.actualLoadKg !== baseline.actualLoadKg) {
    if (current.actualLoadKg === null) patch.actualLoadMode = null;
    else if (baseline.actualLoadKg === null) patch.actualLoadMode = mode;
  }
  return patch;
}

export function executionFieldError(control: AbstractControl): string {
  if (!control.touched || !control.invalid) return '';
  if (control.hasError('server')) return String(control.getError('server'));
  if (control.hasError('executionNumber')) return 'Informe um número válido.';
  if (control.hasError('executionInteger')) return 'Informe um inteiro positivo de até 2147483647.';
  return 'Informe um valor entre 0 e 999999.99, com até duas casas decimais.';
}

export function validateExecutionNumberInput(input: HTMLInputElement | null, control: AbstractControl): void {
  if (input?.validity.badInput) {
    control.setErrors({ ...control.errors, executionNumber: true });
    control.markAsTouched();
  }
}
