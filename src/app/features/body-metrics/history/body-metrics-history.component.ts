import { Component, inject, signal } from '@angular/core';
import { BodyMetricsService } from '../body-metrics.service';
import { finalize } from 'rxjs';
import { ListBodyMetricsResponse } from '../body-metrics.models';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { DatePipe, DecimalPipe } from '@angular/common';

import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-body-metrics-history',
  imports: [
    MatTableModule,
    MatPaginatorModule,
    LoadingComponent,
    EmptyStateComponent,
    DatePipe,
    DecimalPipe,
    ButtonComponent,
  ],
  templateUrl: './body-metrics-history.component.html',
  styleUrl: './body-metrics-history.component.scss',
})
export class BodyMetricsHistoryComponent {
  private readonly bodyMetricsService = inject(BodyMetricsService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);

  readonly metrics = signal<ListBodyMetricsResponse | null>(null);
  readonly loading = signal(false);
  readonly displayedColumns = ['measuredAt', 'weightKg', 'heightCm', 'notes'];

  constructor() {
    this.loadBodyMetricsHistory();
  }

  onPageChange(event: PageEvent): void {
    this.loadBodyMetricsHistory(event.pageIndex, event.pageSize);
  }

  openDetail(id: number): void {
    void this.router.navigate(['/body-metrics', id]);
  }

  openProgress(): void {
    void this.router.navigate(['/body-metrics/progress']);
  }

  private loadBodyMetricsHistory(page?: number, size?: number): void {
    this.loading.set(true);

    this.bodyMetricsService
      .list(page, size)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.metrics.set(response);
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
              void this.router.navigate(['/']);
            });
        },
      });
  }
}
