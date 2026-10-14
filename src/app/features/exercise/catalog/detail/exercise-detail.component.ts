import { Component, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

import { ExerciseService } from '../../exercise.service';
import { DialogService } from '../../../../shared/components/dialog/dialog.service';

import { GetExerciseByIdResponse } from '../../exercise.models';

import { LoadingComponent } from '../../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-exercise-detail',
  imports: [LoadingComponent, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './exercise-detail.component.html',
  styleUrl: './exercise-detail.component.scss',
})
export class ExerciseDetailComponent implements OnInit {
  private readonly exerciseService = inject(ExerciseService);
  private readonly dialogService = inject(DialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly exercise = signal<GetExerciseByIdResponse | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      this.backToExercises();
      return;
    }

    this.loadExercise(id);
  }

  targetRoleLabel(targetRole: string): string {
    const labels: Record<string, string> = {
      PRIMARY: 'Primário',
      SECONDARY: 'Secundário',
      STABILIZER: 'Estabilizador',
    };

    return labels[targetRole] ?? targetRole;
  }

  private loadExercise(id: number): void {
    this.loading.set(true);

    this.exerciseService
      .getExerciseById(id)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.exercise.set(response);
        },

        error: (error) => {
          const message = error.error?.message ?? 'Não foi possível carregar o exercício.';

          this.dialogService
            .open({
              title: 'Não foi possível carregar o exercício',
              message,
              primaryAction: 'Ok',
            })
            .subscribe(() => {
              this.backToExercises();
            });
        },
      });
  }

  backToExercises(): void {
    void this.router.navigate(['/exercises']);
  }
}
