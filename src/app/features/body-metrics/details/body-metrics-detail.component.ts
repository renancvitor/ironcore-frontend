import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';

import { BodyMetricsService } from '../body-metrics.service';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { GetBodyMetricsResponse } from '../body-metrics.models';

import { ButtonComponent } from '../../../shared/components/button/button.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-body-metrics-detail',
  imports: [ButtonComponent, LoadingComponent, DatePipe, DecimalPipe],
  templateUrl: './body-metrics-detail.component.html',
  styleUrl: './body-metrics-detail.component.scss',
})
export class BodyMetricsDetailComponent implements OnInit {
  private readonly bodyMetricsService = inject(BodyMetricsService);
  private readonly dialogService = inject(DialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly metric = signal<GetBodyMetricsResponse | null>(null);

  get returnToHome(): boolean {
    return this.route.snapshot.queryParamMap.get('from') === 'home';
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      this.back();
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
              this.back();
            });
        },
      });
  }

  back(): void {
    void this.router.navigate([this.returnToHome ? '/' : '/body-metrics']);
  }
}
