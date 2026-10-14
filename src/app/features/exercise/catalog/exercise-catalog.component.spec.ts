import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ExerciseService } from '../exercise.service';
import { DialogService } from '../../../shared/components/dialog/dialog.service';

import { ExerciseCatalogComponent } from './exercise-catalog.component';

describe('ExerciseCatalogComponent', () => {
  let component: ExerciseCatalogComponent;
  let fixture: ComponentFixture<ExerciseCatalogComponent>;
  const subgroups = [
    { id: 11, muscleGroupId: 1, code: 'A', name: 'A' },
    { id: 22, muscleGroupId: 2, code: 'B', name: 'B' },
    { id: 33, muscleGroupId: 3, code: 'C', name: 'C' },
  ];
  const service = {
    list: vi.fn(),
    getActivityTypes: () => of([]),
    getEquipmentTypes: () => of([]),
    getMuscleGroups: () => of([]),
    getMuscleSubgroups: () => of(subgroups),
  };

  beforeEach(async () => {
    service.list.mockReset().mockReturnValue(
      of({
        exercises: {
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
          last: true,
        },
      }),
    );
    await TestBed.configureTestingModule({
      imports: [ExerciseCatalogComponent],
      providers: [
        provideRouter([]),
        { provide: ExerciseService, useValue: service },
        { provide: DialogService, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExerciseCatalogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should submit multiple selections and restart pagination', () => {
    component.filtersForm.patchValue({
      name: ' Supino ',
      equipmentTypeIds: [1, 2],
      muscleGroupIds: [1, 2],
      targetRoles: ['PRIMARY', 'SECONDARY'],
    });
    component.applyFilters();
    expect(service.list).toHaveBeenLastCalledWith(
      0,
      20,
      expect.objectContaining({
        name: 'Supino',
        equipmentTypeIds: [1, 2],
        muscleGroupIds: [1, 2],
        targetRoles: ['PRIMARY', 'SECONDARY'],
      }),
    );
  });

  it('should show subgroups from every selected group and clear stale selections', () => {
    component.filtersForm.patchValue({ muscleGroupIds: [1, 2], muscleSubgroupIds: [33] });
    component.onMuscleGroupChange();
    expect(component.visibleMuscleSubgroups()).toEqual(subgroups.slice(0, 2));
    expect(component.filtersForm.controls.muscleSubgroupIds.value).toEqual([]);
    component.filtersForm.controls.muscleGroupIds.setValue([]);
    component.onMuscleGroupChange();
    expect(component.visibleMuscleSubgroups()).toEqual(subgroups);
  });

  it('should clear all selections and restore all subgroups', () => {
    component.filtersForm.patchValue({ equipmentTypeIds: [1, 2], muscleGroupIds: [1] });
    component.onMuscleGroupChange();
    component.clearFilters();
    expect(component.visibleMuscleSubgroups()).toEqual(subgroups);
    expect(service.list).toHaveBeenLastCalledWith(0, 20, {
      name: undefined,
      activityTypeIds: [],
      equipmentTypeIds: [],
      muscleGroupIds: [],
      muscleSubgroupIds: [],
      targetRoles: [],
    });
  });
});
