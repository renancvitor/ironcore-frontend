import { TestBed } from '@angular/core/testing';
import { provideRouter, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../../app.routes';
import { WorkoutPlanningService } from './workout-planning.service';
import { cycleDetail, cyclePage } from './workout-planning.testing';
import { WorkoutCycleCatalogComponent } from './catalog/workout-cycle-catalog.component';
import { WorkoutCycleDetailComponent } from './detail/workout-cycle-detail.component';

describe('Workout Planning navigation', () => {
  it('uses authenticated lazy routes and restores applied filters and page after detail', async () => {
    const authenticated = routes.find((route) => route.path === '' && route.children)!;
    expect(authenticated.canActivate?.length).toBeGreaterThan(0);
    const featureRoutes = authenticated.children!.filter((route) =>
      route.path?.startsWith('workout-planning'),
    ) as Routes;
    expect(featureRoutes.map((route) => route.path)).toEqual([
      'workout-planning',
      'workout-planning/:id',
    ]);
    const list = vi.fn((page = 0, size = 20) => of(cyclePage(page, size)));
    const detail = vi.fn(() => of(cycleDetail));
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(featureRoutes),
        {
          provide: WorkoutPlanningService,
          useValue: {
            listWorkoutCycles: list,
            getWorkoutCycleDetail: detail,
            getTrainingGoals: () => of([]),
          },
        },
      ],
    }).compileComponents();
    const harness = await RouterTestingHarness.create();
    const catalog = await harness.navigateByUrl('/workout-planning', WorkoutCycleCatalogComponent);
    catalog.filtersForm.patchValue({
      name: ' Força ',
      workoutStatus: 'IN_PROGRESS',
      trainingGoalId: 22,
      startDate: '2026-10-01',
    });
    catalog.applyFilters();
    catalog.onPageChange({ pageIndex: 2, pageSize: 50, length: 120 });
    catalog.filtersForm.controls.name.setValue('Edição pendente');
    catalog.openCycle(9);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const component = harness.routeDebugElement!.componentInstance as WorkoutCycleDetailComponent;
    expect(component).toBeInstanceOf(WorkoutCycleDetailComponent);
    expect(detail).toHaveBeenCalledExactlyOnceWith(9);
    harness
      .routeNativeElement!.querySelector<HTMLButtonElement>(
        'button[aria-label="Voltar aos ciclos de treino"]',
      )!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const restored = harness.routeDebugElement!.componentInstance as WorkoutCycleCatalogComponent;
    expect(restored).toBeInstanceOf(WorkoutCycleCatalogComponent);
    expect(restored.filtersForm.controls.name.value).toBe('Força');
    expect(restored.filtersForm.controls.trainingGoalId.value).toBe(22);
    expect(list).toHaveBeenLastCalledWith(
      2,
      50,
      expect.objectContaining({
        name: 'Força',
        workoutStatus: 'IN_PROGRESS',
        trainingGoalId: 22,
        startDate: '2026-10-01',
      }),
    );
    expect(restored.cycles()?.cycles.page).toBe(2);
    expect(restored.cycles()?.cycles.size).toBe(50);
  });
});
