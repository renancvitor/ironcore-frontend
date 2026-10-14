import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

import { ExerciseService } from '../exercise.service';
import { DialogService } from '../../../shared/components/dialog/dialog.service';

import { ListExercisesResponse } from '../exercise.models';

import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-exercise-catalog',
  imports: [MatPaginatorModule, MatTableModule, LoadingComponent, EmptyStateComponent],
  templateUrl: './exercise-catalog.component.html',
  styleUrl: './exercise-catalog.component.scss',
})
export class ExerciseCatalogComponent {
  private readonly exerciseService = inject(ExerciseService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);

  readonly exercises = signal<ListExercisesResponse | null>(null);
  readonly loading = signal(false);

  readonly displayedColumns = [
    'name',
    'activityType',
    'equipmentType',
    'unilateral',
    'compound',
    'suggestedRestSeconds',
  ];

  constructor() {
    this.loadExercises();
  }

  onPageChange(event: PageEvent): void {
    this.loadExercises(event.pageIndex, event.pageSize);
  }

  openExercise(id: number): void {
    void this.router.navigate(['/exercise', id]);
  }

  private loadExercises(page?: number, size?: number): void {
    this.loading.set(true);

    this.exerciseService
      .list(page, size)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.exercises.set(response);
        },

        error: (error) => {
          const message = error.error?.message ?? 'Não foi possível carregar os exercícios.';

          this.dialogService
            .open({
              title: 'Não foi possível carregar os exercícios',
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
