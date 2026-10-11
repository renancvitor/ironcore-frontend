import { Component, inject, signal } from '@angular/core';
import { BodyMetricsService } from '../body-metrics.service';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';

import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

import { ButtonComponent } from '../../../shared/components/button/button.component';

import { CreateBodyMetricsRequest } from '../body-metrics.models';

import { createBodyMetricsForm } from '../body-metrics.form';
import { BodyMetricsFormFieldsComponent } from '../form-fields/body-metrics-form-fields.component';

@Component({
  selector: 'app-body-metrics-create',
  imports: [ReactiveFormsModule, ButtonComponent, BodyMetricsFormFieldsComponent],
  templateUrl: './body-metrics-create.component.html',
  styleUrl: './body-metrics-create.component.scss',
})
export class BodyMetricsCreateComponent {
  private readonly bodyMetricsService = inject(BodyMetricsService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly loading = signal(false);

  readonly form = createBodyMetricsForm();

  createBodyMetrics(): void {
    if (this.loading()) {
      return;
    }

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

  backToHistory(): void {
    void this.router.navigate(['/body-metrics']);
  }
}
