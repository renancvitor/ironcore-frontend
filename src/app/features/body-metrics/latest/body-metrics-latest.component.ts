import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';

import { BodyMetricsService } from '../body-metrics.service';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { GetLatestBodyMetricsResponse } from '../body-metrics.models';

import { ButtonComponent } from '../../../shared/components/button/button.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-body-metrics-latest',
  imports: [ButtonComponent, LoadingComponent, DatePipe, DecimalPipe],
  templateUrl: './body-metrics-latest.component.html',
  styleUrl: './body-metrics-latest.component.scss',
})
export class BodyMetricsLatestComponent implements OnInit {
  private readonly bodyMetricsService = inject(BodyMetricsService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly metric = signal<GetLatestBodyMetricsResponse | null>(null);
  readonly notFound = signal(false);

  ngOnInit(): void {
    this.loadBodyMetric();
  }

  private loadBodyMetric(): void {
    this.loading.set(true);
    this.notFound.set(false);

    this.bodyMetricsService
      .getLatest()
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
          if (error.status === 404) {
            this.notFound.set(true);
            return;
          }

          const message = error.error?.message ?? 'Não foi possível carregar os dados corporais.';

          this.dialogService
            .open({
              title: 'Não foi possível carregar os dados corporais',
              message,
              primaryAction: 'Ok',
            })
            .subscribe(() => {
              void this.router.navigate(['/']);
            });
        },
      });
  }

  backToHome(): void {
    void this.router.navigate(['/']);
  }
}
