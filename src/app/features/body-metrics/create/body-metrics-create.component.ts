import { Component, inject, signal } from '@angular/core';
import { BodyMetricsService } from '../body-metrics.service';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

import { ButtonComponent } from '../../../shared/components/button/button.component';

import { CreateBodyMetricsRequest } from '../body-metrics.models';

const optionalPositiveMax = (max: number): ValidatorFn => {
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

@Component({
  selector: 'app-body-metrics-create',
  imports: [ReactiveFormsModule, ButtonComponent],
  templateUrl: './body-metrics-create.component.html',
  styleUrl: './body-metrics-create.component.scss',
})
export class BodyMetricsCreateComponent {
  private readonly bodyMetricsService = inject(BodyMetricsService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toastService = inject(ToastService);
  private readonly circumferenceValidators = [optionalPositiveMax(300)];

  readonly loading = signal(false);

  readonly form = this.formBuilder.group({
    weightKg: [null as number | null, [Validators.required, optionalPositiveMax(500)]],
    heightCm: [null as number | null, [Validators.required, optionalPositiveMax(300)]],

    neckCm: [null as number | null, this.circumferenceValidators],
    chestCm: [null as number | null, this.circumferenceValidators],
    shoulderCm: [null as number | null, this.circumferenceValidators],
    armCm: [null as number | null, this.circumferenceValidators],
    forearmCm: [null as number | null, this.circumferenceValidators],
    waistCm: [null as number | null, this.circumferenceValidators],
    hipCm: [null as number | null, this.circumferenceValidators],
    thighCm: [null as number | null, this.circumferenceValidators],
    calfCm: [null as number | null, this.circumferenceValidators],

    notes: [''],
  });

  createBodyMetrics(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.buildCreateRequest();

    this.loading.set(true);

    this.bodyMetricsService
      .create(request)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          void this.router.navigate(['/body-metrics', response.id]).then((navigated) => {
            if (navigated) {
              this.toastService.success('Avaliação corporal cadastrada com sucesso.');
            }
          });
        },

        error: (error) => {
          const message = error.error?.message ?? 'Não foi possível cadastrar os dados corporais.';

          this.dialogService.open({
            title: 'Não foi possível cadastrar os dados corporais',
            message,
            primaryAction: 'Ok',
          });
        },
      });
  }

  private buildCreateRequest(): CreateBodyMetricsRequest {
    const value = this.form.getRawValue();

    const hasCircumferences =
      value.neckCm !== null ||
      value.chestCm !== null ||
      value.shoulderCm !== null ||
      value.armCm !== null ||
      value.forearmCm !== null ||
      value.waistCm !== null ||
      value.hipCm !== null ||
      value.thighCm !== null ||
      value.calfCm !== null;

    return {
      weightKg: value.weightKg!,
      heightCm: value.heightCm!,
      circumferences: hasCircumferences
        ? {
            neckCm: value.neckCm,
            chestCm: value.chestCm,
            shoulderCm: value.shoulderCm,
            armCm: value.armCm,
            forearmCm: value.forearmCm,
            waistCm: value.waistCm,
            hipCm: value.hipCm,
            thighCm: value.thighCm,
            calfCm: value.calfCm,
          }
        : null,
      notes: value.notes || null,
    };
  }

  circumferenceError(controlName: keyof typeof this.form.controls): string {
    const control = this.form.controls[controlName];

    if (!control.touched || !control.errors) {
      return '';
    }

    if (control.hasError('positive')) {
      return 'Informe uma medida maior que zero.';
    }

    if (control.hasError('max')) {
      return 'A medida não pode ultrapassar 300 cm.';
    }

    if (control.hasError('number')) {
      return 'Informe um valor válido.';
    }

    return '';
  }

  backToHistory(): void {
    void this.router.navigate(['/body-metrics']);
  }
}
