import { AbstractControl, ValidationErrors } from '@angular/forms';

export function passwordByteLimit(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && new TextEncoder().encode(control.value).length > 72
    ? { passwordByteLimit: true }
    : null;
}
