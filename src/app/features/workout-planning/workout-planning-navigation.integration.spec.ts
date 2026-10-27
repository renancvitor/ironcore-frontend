import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes, RouteReuseStrategy } from '@angular/router';
import { Location } from '@angular/common';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom, of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { routes } from '../../app.routes';
import { HomeComponent } from '../home/home.component';
import { BodyMetricsService } from '../body-metrics/body-metrics.service';
import { WorkoutPlanningService } from './workout-planning.service';
import { WorkoutSessionsService } from '../workout-sessions/workout-sessions.service';
import { cycleDetail, cyclePage } from './workout-planning.testing';
import { WorkoutCycleCatalogComponent } from './catalog/workout-cycle-catalog.component';
import { WorkoutCycleDetailComponent } from './detail/workout-cycle-detail.component';
import { WorkoutCycleCreateComponent } from './create/workout-cycle-create.component';
import { WorkoutCycleFormComponent } from './form/workout-cycle-form.component';
import { WorkoutCycleCatalogStateService } from './catalog/workout-cycle-catalog-state.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import {
  CreateWorkoutCycleRequest,
  GetWorkoutCycleDetailResponse,
} from './workout-planning.models';

describe('Workout Planning navigation', () => {
  it.each(['IN_PROGRESS', 'NOT_STARTED'] as const)(
    'returns to Home after opening a %s cycle from its summary card',
    async (status) => {
      const featureRoutes = routes
        .find((route) => route.path === '' && route.children)!
        .children!.filter(
          (route) => route.path === '' || route.path?.startsWith('workout-planning'),
        );
      const cycle = {
        ...cycleDetail,
        workoutStatus: status,
        startDate: status === 'NOT_STARTED' ? null : cycleDetail.startDate,
      };
      const summaryCycles = [cycle, { ...cycle, id: 12, name: 'Corrida' }];
      await TestBed.configureTestingModule({
        providers: [
          { provide: WorkoutSessionsService, useValue: {} },
          provideRouter(featureRoutes),
          {
            provide: BodyMetricsService,
            useValue: { getLatest: () => of(null), getChanges: () => of({ changes: [] }) },
          },
          {
            provide: WorkoutPlanningService,
            useValue: {
              listWorkoutCycles: (
                _page: number,
                _size: number,
                filters: { workoutStatus: string },
              ) =>
                of({
                  cycles: {
                    content: filters.workoutStatus === status ? summaryCycles : [],
                    totalElements: filters.workoutStatus === status ? 2 : 0,
                  },
                }),
              getWorkoutCycleDetail: (id: number) =>
                of(summaryCycles.find((item) => item.id === id)),
            },
          },
        ],
      }).compileComponents();
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/', HomeComponent);
      for (const [index, id] of [9, 12].entries()) {
        harness
          .routeNativeElement!.querySelectorAll<HTMLAnchorElement>(
            'app-in-progress-workouts-card li a',
          )
          [index].click();
        await harness.fixture.whenStable();
        harness.detectChanges();
        expect(TestBed.inject(Router).url).toBe(`/workout-planning/${id}?from=home`);
        expect(harness.routeDebugElement!.componentInstance).toBeInstanceOf(
          WorkoutCycleDetailComponent,
        );
        harness
          .routeNativeElement!.querySelector<HTMLButtonElement>(
            'button[aria-label="Voltar ao início"]',
          )!
          .click();
        await harness.fixture.whenStable();
        harness.detectChanges();
        expect(TestBed.inject(Router).url).toBe('/');
        expect(harness.routeDebugElement!.componentInstance).toBeInstanceOf(HomeComponent);
        expect(harness.routeNativeElement!.querySelectorAll('.ic-summary-card')).toHaveLength(3);
      }
    },
  );

  it.each([
    ['NOT_STARTED', 'start', 'Iniciar ciclo de treino', 'IN_PROGRESS', 'Em andamento'],
    ['IN_PROGRESS', 'complete', 'Concluir ciclo de treino', 'COMPLETED', 'Concluído'],
    ['NOT_STARTED', 'cancel', 'Cancelar ciclo de treino', 'CANCELLED', 'Cancelado'],
    ['IN_PROGRESS', 'cancel', 'Cancelar ciclo de treino', 'CANCELLED', 'Cancelado'],
  ] as const)(
    'refreshes the catalog after %s -> %s with preserved filters and pagination',
    async (initial, action, label, status, statusLabel) => {
      let stored: GetWorkoutCycleDetailResponse = {
        ...cycleDetail,
        workoutStatus: initial,
        endDate: null,
        startDate: initial === 'NOT_STARTED' ? null : '2026-10-01',
      };
      const transition = vi.fn(() => {
        stored = {
          ...stored,
          workoutStatus: status,
          startDate: action === 'start' ? '2026-10-17' : stored.startDate,
          endDate: action === 'complete' ? '2026-10-17' : stored.endDate,
        };
        return of({
          id: 9,
          trainingGoalId: 22,
          workoutStatus: status,
          ...(action === 'start' || action === 'complete' ? { startDate: stored.startDate! } : {}),
          ...(action === 'complete' ? { endDate: stored.endDate! } : {}),
        });
      });
      const list = vi.fn((page: number, size: number) =>
        of({
          cycles: { ...cyclePage(page, size).cycles, content: [stored] },
        }),
      );
      const featureRoutes = routes
        .find((route) => route.path === '' && route.children)!
        .children!.filter((route) => route.path?.startsWith('workout-planning'));
      await TestBed.configureTestingModule({
        providers: [
          { provide: WorkoutSessionsService, useValue: {} },
          provideRouter(featureRoutes),
          { provide: ToastService, useValue: { success: vi.fn() } },
          {
            provide: WorkoutPlanningService,
            useValue: {
              listWorkoutCycles: list,
              getWorkoutCycleDetail: () => of(stored),
              getTrainingGoals: () => of([]),
              startWorkoutCycle: transition,
              completeWorkoutCycle: transition,
              cancelWorkoutCycle: transition,
            },
          },
        ],
      }).compileComponents();
      const state = TestBed.inject(WorkoutCycleCatalogStateService);
      state.filters = { name: 'Força' };
      state.page = 2;
      state.size = 50;
      const harness = await RouterTestingHarness.create();
      const catalog = await harness.navigateByUrl(
        '/workout-planning',
        WorkoutCycleCatalogComponent,
      );
      catalog.openCycle(9);
      await harness.fixture.whenStable();
      harness.detectChanges();
      harness
        .routeNativeElement!.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!
        .click();
      harness.detectChanges();
      if (action !== 'start') {
        const loader = TestbedHarnessEnvironment.documentRootLoader(harness.fixture);
        const dialog = await loader.getHarness(MatDialogHarness);
        expect(await dialog.getText()).toContain('Esta ação não pode ser desfeita.');
        const closed = firstValueFrom(TestBed.inject(MatDialog).openDialogs[0].afterClosed());
        await (
          await dialog.getHarness(
            MatButtonHarness.with({ text: action === 'complete' ? 'Concluir' : 'Cancelar ciclo' }),
          )
        ).click();
        expect(await closed).toBe(true);
      }
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(transition).toHaveBeenCalledExactlyOnceWith(9);
      const detail = harness.routeDebugElement!.componentInstance as WorkoutCycleDetailComponent;
      expect(detail.cycle()?.workoutStatus).toBe(status);
      detail.backToCycles();
      await harness.fixture.whenStable();
      harness.detectChanges();
      const refreshed = harness.routeDebugElement!
        .componentInstance as WorkoutCycleCatalogComponent;
      expect(refreshed).toBeInstanceOf(WorkoutCycleCatalogComponent);
      expect(refreshed.cycles()?.cycles.content[0]).toEqual(stored);
      expect(harness.routeNativeElement!.textContent).toContain(statusLabel);
      if (action !== 'cancel')
        expect(harness.routeNativeElement!.textContent).toContain('17/10/2026');
      expect(list).toHaveBeenCalledTimes(2);
      expect(list).toHaveBeenLastCalledWith(2, 50, { name: 'Força' });
      expect(refreshed.filtersForm.controls.name.value).toBe('Força');
    },
  );

  it.each(['cancel', 'save'] as const)(
    'clears edit=true after %s, replaces history and keeps other query params',
    async (action) => {
      await TestBed.configureTestingModule({
        providers: [
          { provide: WorkoutSessionsService, useValue: {} },
          provideRouter([{ path: 'workout-planning/:id', component: WorkoutCycleDetailComponent }]),
          {
            provide: WorkoutPlanningService,
            useValue: {
              getWorkoutCycleDetail: () => of(cycleDetail),
              getTrainingGoals: () =>
                of([{ id: 22, code: 'GOAL', name: cycleDetail.trainingGoal.name }]),
              updateWorkoutCycle: () => of({ ...cycleDetail, trainingGoalId: 22 }),
            },
          },
          { provide: ToastService, useValue: { success: vi.fn() } },
        ],
      }).compileComponents();
      const harness = await RouterTestingHarness.create();
      const component = await harness.navigateByUrl(
        '/workout-planning/9?edit=true&source=catalog',
        WorkoutCycleDetailComponent,
      );
      expect(component.editing()).toBe(true);
      const location = TestBed.inject(Location);
      const replace = vi.spyOn(location, 'replaceState');
      const push = vi.spyOn(location, 'go');
      if (action === 'cancel') component.cancelEdit();
      else component.save();
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(TestBed.inject(Router).url).toBe('/workout-planning/9?source=catalog');
      expect(component.editing()).toBe(false);
      expect(replace).toHaveBeenCalledTimes(1);
      expect(push).not.toHaveBeenCalled();
      const refreshedUrl = TestBed.inject(Router).url;
      vi.spyOn(TestBed.inject(RouteReuseStrategy), 'shouldReuseRoute').mockReturnValue(false);
      await TestBed.inject(Router).navigateByUrl(refreshedUrl, { onSameUrlNavigation: 'reload' });
      harness.detectChanges();
      expect(
        (harness.routeDebugElement!.componentInstance as WorkoutCycleDetailComponent).editing(),
      ).toBe(false);
    },
  );

  it('creates, edits and confirms deletion with real routes and refreshes the preserved catalog', async () => {
    const featureRoutes = routes
      .find((route) => route.path === '' && route.children)!
      .children!.filter((route) => route.path?.startsWith('workout-planning'));
    let stored: GetWorkoutCycleDetailResponse | null = {
      ...cycleDetail,
      workoutStatus: 'NOT_STARTED',
    };
    const success = vi.fn();
    const service = {
      getTrainingGoals: () => of([{ id: 22, code: 'GOAL', name: cycleDetail.trainingGoal.name }]),
      listWorkoutCycles: vi.fn((page: number, size: number) =>
        of({
          cycles: {
            ...cyclePage(page, size).cycles,
            content: stored ? [stored] : [],
            totalElements: stored ? 1 : 0,
            totalPages: stored ? 1 : 0,
          },
        }),
      ),
      getWorkoutCycleDetail: vi.fn(() => of(stored!)),
      createWorkoutCycle: vi.fn((request: CreateWorkoutCycleRequest) => {
        stored = {
          ...cycleDetail,
          id: 16,
          name: request.name,
          workoutStatus: 'NOT_STARTED',
          startDate: null,
          endDate: null,
          desiredDurationMonths: request.desiredDurationMonths ?? null,
          weekStartsOn: request.weekStartsOn ?? stored?.weekStartsOn ?? 'SUNDAY',
          notes: request.notes ?? null,
          days: [],
        };
        return of({
          id: 16,
          personId: 1,
          ...request,
          desiredDurationMonths: stored.desiredDurationMonths,
          weekStartsOn: stored.weekStartsOn,
          notes: stored.notes,
          workoutStatus: 'NOT_STARTED',
          workoutOrigin: 'MANUAL',
          createdAt: '',
        });
      }),
      updateWorkoutCycle: vi.fn((id: number, request: CreateWorkoutCycleRequest) => {
        stored = {
          ...stored!,
          ...request,
          weekStartsOn: request.weekStartsOn ?? stored!.weekStartsOn,
          desiredDurationMonths: request.desiredDurationMonths ?? null,
          notes: request.notes ?? null,
        };
        return of({
          id,
          ...request,
          startDate: null,
          workoutStatus: 'NOT_STARTED',
          workoutOrigin: 'MANUAL',
          updatedAt: '',
        });
      }),
      deleteWorkoutCycle: vi.fn(() => {
        stored = null;
        return of(undefined);
      }),
    };
    await TestBed.configureTestingModule({
      providers: [
        { provide: WorkoutSessionsService, useValue: {} },
        provideRouter(featureRoutes),
        { provide: WorkoutPlanningService, useValue: service },
        { provide: ToastService, useValue: { success } },
      ],
    }).compileComponents();
    const state = TestBed.inject(WorkoutCycleCatalogStateService);
    state.filters = { name: 'Ciclo' };
    state.size = 50;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/workout-planning', WorkoutCycleCatalogComponent);
    harness
      .routeNativeElement!.querySelector<HTMLButtonElement>('[aria-label="Novo ciclo"]')!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeDebugElement!.componentInstance).toBeInstanceOf(
      WorkoutCycleCreateComponent,
    );
    let editor = harness.routeDebugElement!.query(By.directive(WorkoutCycleFormComponent))
      .componentInstance as WorkoutCycleFormComponent;
    editor.form().patchValue({ name: 'Ciclo criado', trainingGoalId: 22 });
    editor.submit();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeDebugElement!.componentInstance).toBeInstanceOf(
      WorkoutCycleDetailComponent,
    );
    expect(harness.routeNativeElement!.textContent).toContain('Ciclo criado');
    expect(service.getWorkoutCycleDetail).toHaveBeenLastCalledWith(16);
    harness
      .routeNativeElement!.querySelector<HTMLButtonElement>(
        '[aria-label="Editar ciclo de treino"]',
      )!
      .click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    editor = harness.routeDebugElement!.query(By.directive(WorkoutCycleFormComponent))
      .componentInstance as WorkoutCycleFormComponent;
    editor.form().controls.name.setValue('Ciclo editado');
    editor.submit();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Ciclo editado');
    const detail = harness.routeDebugElement!.componentInstance as WorkoutCycleDetailComponent;
    detail.backToCycles();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Ciclo editado');
    expect(service.listWorkoutCycles).toHaveBeenLastCalledWith(0, 50, { name: 'Ciclo' });
    harness
      .routeNativeElement!.querySelector<HTMLButtonElement>('td.mat-column-actions button')!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(
      harness.routeDebugElement!.query(By.directive(WorkoutCycleFormComponent)),
    ).not.toBeNull();
    editor = harness.routeDebugElement!.query(By.directive(WorkoutCycleFormComponent))
      .componentInstance as WorkoutCycleFormComponent;
    expect(editor.form().controls.name.value).toBe('Ciclo editado');
    editor.cancelled.emit();
    harness.detectChanges();
    (harness.routeDebugElement!.componentInstance as WorkoutCycleDetailComponent).backToCycles();
    await harness.fixture.whenStable();
    harness.detectChanges();
    harness
      .routeNativeElement!.querySelector<HTMLButtonElement>(
        'td.mat-column-actions button[aria-label="Excluir ciclo Ciclo editado"]',
      )!
      .click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    const loader = TestbedHarnessEnvironment.documentRootLoader(harness.fixture);
    const dialog = await loader.getHarness(MatDialogHarness);
    expect(await dialog.getText()).toContain('Esta ação não pode ser desfeita.');
    const confirm = await dialog.getHarness(MatButtonHarness.with({ text: 'Excluir' }));
    const closed = firstValueFrom(TestBed.inject(MatDialog).openDialogs[0].afterClosed());
    await confirm.click();
    expect(await closed).toBe(true);
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(service.deleteWorkoutCycle).toHaveBeenCalledExactlyOnceWith(16);
    expect(harness.routeDebugElement!.componentInstance).toBeInstanceOf(
      WorkoutCycleCatalogComponent,
    );
    expect(harness.routeNativeElement!.textContent).toContain('Nenhum ciclo de treino encontrado.');
    expect(harness.routeNativeElement!.textContent).not.toContain('Ciclo editado');
    expect(state.filters).toEqual({ name: 'Ciclo' });
    expect(state.size).toBe(50);
    expect(success).toHaveBeenCalledTimes(3);
  });

  it('uses authenticated lazy routes and restores applied filters and page after detail', async () => {
    const authenticated = routes.find((route) => route.path === '' && route.children)!;
    expect(authenticated.canActivate?.length).toBeGreaterThan(0);
    const featureRoutes = authenticated.children!.filter((route) =>
      route.path?.startsWith('workout-planning'),
    ) as Routes;
    expect(featureRoutes.map((route) => route.path)).toEqual([
      'workout-planning',
      'workout-planning/create',
      'workout-planning/:id',
    ]);
    const list = vi.fn((page = 0, size = 20) => of(cyclePage(page, size)));
    const detail = vi.fn(() => of(cycleDetail));
    await TestBed.configureTestingModule({
      providers: [
        { provide: WorkoutSessionsService, useValue: {} },
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
