import { Component, DestroyRef, inject, input, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ExerciseService } from '../exercise.service';
import { DialogService } from '../../../shared/components/dialog/dialog.service';

import {
  ActivityTypeItemResponse,
  EquipmentTypeItemResponse,
  ListExercisesRequest,
  ListExercisesResponse,
  MuscleGroupItemResponse,
  MuscleSubgroupItemResponse,
  TargetRole,
} from '../exercise.models';

import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

import { ExerciseCatalogMode } from './exercise-catalog.types';
import { ExerciseCatalogStateService } from './exercise-catalog-state.service';

@Component({
  selector: 'app-exercise-catalog',
  imports: [
    ReactiveFormsModule,
    MatPaginatorModule,
    MatTableModule,
    LoadingComponent,
    EmptyStateComponent,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    InputComponent,
    ButtonComponent,
  ],
  templateUrl: './exercise-catalog.component.html',
  styleUrl: './exercise-catalog.component.scss',
})
export class ExerciseCatalogComponent {
  private readonly exerciseService = inject(ExerciseService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly catalogState = inject(ExerciseCatalogStateService);
  readonly catalogErrors = signal<Record<string, string>>({});
  readonly catalogsLoading = signal(false);
  private pendingCatalogs = 0;

  readonly exercises = signal<ListExercisesResponse | null>(null);
  readonly loading = signal(false);
  readonly mode = input<ExerciseCatalogMode>('browse');
  readonly activityTypes = signal<ActivityTypeItemResponse[]>([]);
  readonly equipmentTypes = signal<EquipmentTypeItemResponse[]>([]);
  readonly muscleGroups = signal<MuscleGroupItemResponse[]>([]);
  readonly muscleSubgroups = signal<MuscleSubgroupItemResponse[]>([]);

  readonly visibleMuscleSubgroups = signal<MuscleSubgroupItemResponse[]>([]);

  readonly displayedColumns = [
    'name',
    'activityType',
    'equipmentType',
    'unilateral',
    'compound',
    'suggestedRestSeconds',
  ];

  readonly filtersForm = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    activityTypeIds: new FormControl<number[]>([], { nonNullable: true }),
    equipmentTypeIds: new FormControl<number[]>([], { nonNullable: true }),
    muscleGroupIds: new FormControl<number[]>([], { nonNullable: true }),
    muscleSubgroupIds: new FormControl<number[]>([], { nonNullable: true }),
    targetRoles: new FormControl<TargetRole[]>([], { nonNullable: true }),
  });

  constructor() {
    this.filtersForm.patchValue({
      ...this.catalogState.filters,
      name: this.catalogState.filters.name ?? '',
    });
    this.loadExercises(this.catalogState.page, this.catalogState.size);
    this.loadFilterCatalogs();
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
      .list(page, size, this.catalogState.filters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.exercises.set(response);
          this.catalogState.page = response.exercises.page;
          this.catalogState.size = response.exercises.size;
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

  loadFilterCatalogs(): void {
    if (this.catalogsLoading()) return;
    this.loadCatalog(
      'activityTypeIds',
      'tipos de atividade',
      this.exerciseService.getActivityTypes(),
      this.activityTypes,
    );
    this.loadCatalog(
      'equipmentTypeIds',
      'equipamentos',
      this.exerciseService.getEquipmentTypes(),
      this.equipmentTypes,
    );
    this.loadCatalog(
      'muscleGroupIds',
      'grupos musculares',
      this.exerciseService.getMuscleGroups(),
      this.muscleGroups,
    );
    this.loadCatalog(
      'muscleSubgroupIds',
      'subgrupos musculares',
      this.exerciseService.getMuscleSubgroups(),
      this.muscleSubgroups,
    );
  }

  catalogErrorMessages(): string[] {
    return Object.values(this.catalogErrors());
  }

  private loadCatalog<T>(
    field: 'activityTypeIds' | 'equipmentTypeIds' | 'muscleGroupIds' | 'muscleSubgroupIds',
    label: string,
    request: Observable<T[]>,
    destination: WritableSignal<T[]>,
  ): void {
    const control = this.filtersForm.controls[field];
    control.disable({ emitEvent: false });
    this.pendingCatalogs++;
    this.catalogsLoading.set(true);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.catalogsLoading.set(--this.pendingCatalogs > 0)),
      )
      .subscribe({
        next: (response) => {
          destination.set(response);
          control.enable({ emitEvent: false });
          this.catalogErrors.update((errors) => {
            const updated = { ...errors };
            delete updated[field];
            return updated;
          });
          this.updateVisibleMuscleSubgroups();
        },
        error: () =>
          this.catalogErrors.update((errors) => ({
            ...errors,
            [field]: `Não foi possível carregar ${label}.`,
          })),
      });
  }

  private buildFiltersRequest(): ListExercisesRequest {
    const filters = this.filtersForm.getRawValue();

    const name = filters.name.trim();

    return {
      name: name || undefined,
      activityTypeIds: filters.activityTypeIds,
      equipmentTypeIds: filters.equipmentTypeIds,
      muscleGroupIds: filters.muscleGroupIds,
      muscleSubgroupIds: filters.muscleSubgroupIds,
      targetRoles: filters.targetRoles,
    };
  }

  applyFilters(): void {
    if (this.loading()) return;
    this.catalogState.filters = this.buildFiltersRequest();
    const size = this.exercises()?.exercises.size;

    this.loadExercises(0, size);
  }

  clearFilters(): void {
    if (this.loading()) return;
    this.filtersForm.reset({
      name: '',
      activityTypeIds: [],
      equipmentTypeIds: [],
      muscleGroupIds: [],
      muscleSubgroupIds: [],
      targetRoles: [],
    });

    this.updateVisibleMuscleSubgroups();
    this.catalogState.filters = this.buildFiltersRequest();
    this.loadExercises(0, this.exercises()?.exercises.size);
  }

  onMuscleGroupChange(): void {
    this.filtersForm.controls.muscleSubgroupIds.setValue([]);
    this.updateVisibleMuscleSubgroups();
  }

  clearFilter(field: Exclude<keyof typeof this.filtersForm.controls, 'name'>, event: Event): void {
    event.stopPropagation();
    this.filtersForm.controls[field].setValue([]);
    if (field === 'muscleGroupIds') {
      this.onMuscleGroupChange();
    }
  }

  private updateVisibleMuscleSubgroups(): void {
    const groups = this.filtersForm.controls.muscleGroupIds.value;
    this.visibleMuscleSubgroups.set(
      this.muscleSubgroups().filter(
        (subgroup) => groups.length === 0 || groups.includes(subgroup.muscleGroupId),
      ),
    );
  }
}
