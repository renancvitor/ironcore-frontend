import { FormControl, FormGroup, Validators } from '@angular/forms';

import { optionalPositiveMax } from './body-metrics.validators';

export function createBodyMetricsForm() {
  const measurement = (max = 300, required = false) =>
    new FormControl<number | null>(null, {
      validators: required
        ? [Validators.required, optionalPositiveMax(max)]
        : [optionalPositiveMax(max)],
    });

  return new FormGroup({
    weightKg: measurement(500, true),
    heightCm: measurement(300, true),
    neckCm: measurement(),
    chestCm: measurement(),
    shoulderCm: measurement(),
    armCm: measurement(),
    forearmCm: measurement(),
    waistCm: measurement(),
    hipCm: measurement(),
    thighCm: measurement(),
    calfCm: measurement(),
    notes: new FormControl('', { nonNullable: true }),
  });
}

export type BodyMetricsForm = ReturnType<typeof createBodyMetricsForm>;
