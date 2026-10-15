import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ExerciseCatalogStateService } from './exercise-catalog-state.service';
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
    getActivityTypes: vi.fn(() => of([])),
    getEquipmentTypes: () => of([]),
    getMuscleGroups: () => of([]),
    getMuscleSubgroups: () => of(subgroups),
  };

  beforeEach(async () => {
    service.getActivityTypes.mockReset().mockReturnValue(of([]));
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

  it('should paginate with applied filters instead of pending edits', () => {
    component.filtersForm.patchValue({ name: 'Supino', equipmentTypeIds: [1] });
    component.applyFilters();
    component.filtersForm.patchValue({ name: 'Remada', equipmentTypeIds: [2] });
    component.onPageChange({ pageIndex: 1, pageSize: 20, length: 100 });
    expect(service.list).toHaveBeenLastCalledWith(
      1,
      20,
      expect.objectContaining({
        name: 'Supino',
        equipmentTypeIds: [1],
      }),
    );
  });

  it('should restore the applied search and page when the catalog is recreated', async () => {
    component.filtersForm.patchValue({ muscleGroupIds: [1], muscleSubgroupIds: [11] });
    component.applyFilters();
    const state = TestBed.inject(ExerciseCatalogStateService);
    state.page = 2;
    state.size = 50;
    fixture.destroy();
    fixture = TestBed.createComponent(ExerciseCatalogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    expect(service.list).toHaveBeenLastCalledWith(
      2,
      50,
      expect.objectContaining({ muscleSubgroupIds: [11] }),
    );
    expect(component.filtersForm.controls.name.value).toBe('');
    expect(component.filtersForm.controls.muscleSubgroupIds.value).toEqual([11]);
    expect(component.visibleMuscleSubgroups()).toEqual([subgroups[0]]);
    component.applyFilters();
  });

  it('should report a catalog failure, disable its selector and recover on retry', () => {
    service.getActivityTypes.mockReturnValueOnce(throwError(() => new Error('offline')));
    component.loadFilterCatalogs();
    expect(component.filtersForm.controls.activityTypeIds.disabled).toBe(true);
    expect(component.filtersForm.controls.equipmentTypeIds.enabled).toBe(true);
    expect(component.catalogErrorMessages()).toEqual([
      'Não foi possível carregar tipos de atividade.',
    ]);
    component.loadFilterCatalogs();
    expect(component.filtersForm.controls.activityTypeIds.enabled).toBe(true);
    expect(component.catalogErrorMessages()).toEqual([]);
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

  it.each(['activityTypeIds', 'equipmentTypeIds', 'muscleSubgroupIds', 'targetRoles'] as const)(
    'should clear only %s without submitting pending edits',
    (field) => {
      component.filtersForm.patchValue({
        activityTypeIds: [1],
        equipmentTypeIds: [2],
        muscleGroupIds: [1],
        muscleSubgroupIds: [11],
        targetRoles: ['PRIMARY'],
      });
      const previous = component.filtersForm.getRawValue();
      const calls = service.list.mock.calls.length;
      const event = new Event('click');
      const stop = vi.spyOn(event, 'stopPropagation');
      component.clearFilter(field, event);
      expect(component.filtersForm.getRawValue()).toEqual({ ...previous, [field]: [] });
      expect(stop).toHaveBeenCalledOnce();
      expect(service.list).toHaveBeenCalledTimes(calls);
    },
  );

  it('should clear dependent subgroups when removing the group filter', () => {
    component.filtersForm.patchValue({ muscleGroupIds: [1], muscleSubgroupIds: [11] });
    component.onMuscleGroupChange();
    component.filtersForm.controls.muscleSubgroupIds.setValue([11]);
    component.clearFilter('muscleGroupIds', new Event('click'));
    expect(component.filtersForm.controls.muscleSubgroupIds.value).toEqual([]);
    expect(component.visibleMuscleSubgroups()).toEqual(subgroups);
  });
});
