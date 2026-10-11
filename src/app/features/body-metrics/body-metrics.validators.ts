import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const optionalPositiveMax = (max: number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (value === null || value === '') {
      return null;
    }

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { number: true };
    }

    if (value <= 0) {
      return { positive: true };
    }

    if (value > max) {
      return { max: true };
    }

    return null;
  };
};
