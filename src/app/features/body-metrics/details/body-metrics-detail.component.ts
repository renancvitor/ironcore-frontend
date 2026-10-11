import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { BodyMetricsService } from '../body-metrics.service';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { GetBodyMetricsResponse, UpdateBodyMetricsRequest } from '../body-metrics.models';

import { ButtonComponent } from '../../../shared/components/button/button.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

import { createBodyMetricsForm } from '../body-metrics.form';
import { BodyMetricsFormFieldsComponent } from '../form-fields/body-metrics-form-fields.component';

@Component({
  selector: 'app-body-metrics-detail',
  imports: [
    ButtonComponent,
    LoadingComponent,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    BodyMetricsFormFieldsComponent,
  ],
  templateUrl: './body-metrics-detail.component.html',
  styleUrl: './body-metrics-detail.component.scss',
})
export class BodyMetricsDetailComponent implements OnInit {
  private readonly bodyMetricsService = inject(BodyMetricsService);
  private readonly dialogService = inject(DialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly loading = signal(false);
  readonly metric = signal<GetBodyMetricsResponse | null>(null);
  readonly saving = signal(false);
  readonly editing = signal(false);

  readonly form = createBodyMetricsForm();

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      this.backToHistory();
      return;
    }

    this.loadBodyMetric(id);
  }

  private loadBodyMetric(id: number): void {
    this.loading.set(true);

    this.bodyMetricsService
      .getById(id)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.metric.set(response);
        },

        error: (error) => {
          const message = error.error?.message ?? 'Não foi possível carregar os dados corporais.';

          this.dialogService
            .open({
              title: 'Não foi possível carregar os dados corporais',
              message,
              primaryAction: 'Ok',
            })
            .subscribe(() => {
              this.backToHistory();
            });
        },
      });
  }

  private buildUpdateRequest(): UpdateBodyMetricsRequest {
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

  startEdit(): void {
    const metric = this.metric();

    if (!metric || this.saving()) {
      return;
    }

    this.form.setValue({
      weightKg: metric.weightKg,
      heightCm: metric.heightCm,

      neckCm: metric.circumferences?.neckCm ?? null,
      chestCm: metric.circumferences?.chestCm ?? null,
      shoulderCm: metric.circumferences?.shoulderCm ?? null,
      armCm: metric.circumferences?.armCm ?? null,
      forearmCm: metric.circumferences?.forearmCm ?? null,
      waistCm: metric.circumferences?.waistCm ?? null,
      hipCm: metric.circumferences?.hipCm ?? null,
      thighCm: metric.circumferences?.thighCm ?? null,
      calfCm: metric.circumferences?.calfCm ?? null,

      notes: metric.notes ?? '',
    });

    this.editing.set(true);
  }

  cancelEdit(): void {
    if (this.saving()) {
      return;
    }

    this.editing.set(false);
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const metric = this.metric();

    if (!metric) {
      return;
    }

    const request = this.buildUpdateRequest();

    this.form.disable({ emitEvent: false });
    this.saving.set(true);

    this.bodyMetricsService
      .update(metric.id, request)
      .pipe(
        finalize(() => {
          this.form.enable({ emitEvent: false });
          this.saving.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.metric.set(response);
          this.editing.set(false);
          this.toastService.success('Dados corporais atualizados com sucesso.');
        },

        error: (error) => {
          const message = error.error?.message ?? 'Não foi possível atualizar os dados corporais.';

          this.dialogService.open({
            title: 'Não foi possível atualizar os dados corporais',
            message,
            primaryAction: 'Ok',
          });
        },
      });
  }

  backToHistory(): void {
    void this.router.navigate(['/body-metrics']);
  }
}
