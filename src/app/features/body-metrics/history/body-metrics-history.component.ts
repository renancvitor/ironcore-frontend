import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { BodyMetricsService } from '../body-metrics.service';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

import { ListBodyMetricsResponse } from '../body-metrics.models';

import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
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
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './body-metrics-history.component.html',
  styleUrl: './body-metrics-history.component.scss',
})
export class BodyMetricsHistoryComponent {
  private readonly bodyMetricsService = inject(BodyMetricsService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly metrics = signal<ListBodyMetricsResponse | null>(null);
  readonly loading = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly displayedColumns = ['measuredAt', 'weightKg', 'heightCm', 'notes', 'actions'];

  constructor() {
    this.loadBodyMetricsHistory();
  }

  onPageChange(event: PageEvent): void {
    if (this.deletingId() !== null) {
      return;
    }

    this.loadBodyMetricsHistory(event.pageIndex, event.pageSize);
  }

  openDetail(id: number): void {
    if (this.deletingId() !== null) {
      return;
    }

    void this.router.navigate(['/body-metrics', id]);
  }

  openProgress(): void {
    if (this.deletingId() !== null) {
      return;
    }

    void this.router.navigate(['/body-metrics/progress']);
  }

  openCreate(): void {
    if (this.deletingId() !== null) {
      return;
    }

    void this.router.navigate(['/body-metrics/create']);
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

  deleteBodyMetrics(id: number): void {
    if (this.deletingId() !== null) {
      return;
    }

    this.dialogService
      .open({
        title: 'Excluir avaliação corporal',
        message:
          'Esta ação é permanente e não poderá ser desfeita. Deseja realmente excluir esta avaliação?',
        primaryAction: 'Excluir',
        secondaryAction: 'Cancelar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.deletingId.set(id);

        this.bodyMetricsService
          .delete(id)
          .pipe(
            finalize(() => {
              this.deletingId.set(null);
            }),
          )
          .subscribe({
            next: () => {
              this.metrics.set(null);

              this.toastService.success('Avaliação corporal excluída com sucesso.');
              this.loadBodyMetricsHistory();
            },

            error: (error) => {
              const message =
                error.error?.message ?? 'Não foi possível excluir a avaliação corporal.';

              this.dialogService.open({
                title: 'Não foi possível excluir a avaliação corporal',
                message,
                primaryAction: 'Ok',
              });
            },
          });
      });
  }
}
