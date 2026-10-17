import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { MatPaginator } from '@angular/material/paginator';
import { of, Subject, throwError } from 'rxjs';
import { WorkoutPlanningService } from '../workout-planning.service';
import {
  ListWorkoutCyclesResponse,
  TrainingGoalResponse,
  WorkoutStatus,
} from '../workout-planning.models';
import { cyclePage } from '../workout-planning.testing';
import { WorkoutCycleCatalogComponent } from './workout-cycle-catalog.component';
import { WorkoutCycleCatalogStateService } from './workout-cycle-catalog-state.service';

describe('WorkoutCycleCatalogComponent', () => {
  let fixture: ComponentFixture<WorkoutCycleCatalogComponent>;
  let component: WorkoutCycleCatalogComponent;
  const service = { listWorkoutCycles: vi.fn(), getTrainingGoals: vi.fn() };
  const goals = [{ id: 22, code: 'BACKEND_CODE', name: 'Objetivo do backend' }];
  const filters = {
    name: 'Força',
    workoutStatus: 'IN_PROGRESS' as WorkoutStatus,
    trainingGoalId: 22,
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  };

  beforeEach(async () => {
    service.listWorkoutCycles.mockReset().mockReturnValue(of(cyclePage()));
    service.getTrainingGoals.mockReset().mockReturnValue(of(goals));
    await TestBed.configureTestingModule({
      imports: [WorkoutCycleCatalogComponent],
      providers: [provideRouter([]), { provide: WorkoutPlanningService, useValue: service }],
    }).compileComponents();
  });

  async function create(): Promise<void> {
    fixture = TestBed.createComponent(WorkoutCycleCatalogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('shows initial loading, disables goals and ignores duplicate requests', async () => {
    const cycles = new Subject<ListWorkoutCyclesResponse>();
    const catalog = new Subject<TrainingGoalResponse[]>();
    service.listWorkoutCycles.mockReturnValue(cycles);
    service.getTrainingGoals.mockReturnValue(catalog);
    await create();
    expect(fixture.nativeElement.querySelector('app-loading')).not.toBeNull();
    expect(component.filtersForm.controls.trainingGoalId.disabled).toBe(true);
    component.applyFilters();
    component.clearFilters();
    component.loadCycles();
    component.onPageChange({ pageIndex: 1, pageSize: 20, length: 120 });
    component.loadTrainingGoals();
    expect(service.listWorkoutCycles).toHaveBeenCalledTimes(1);
    expect(service.getTrainingGoals).toHaveBeenCalledTimes(1);
    cycles.next(cyclePage());
    cycles.complete();
    catalog.next(goals);
    catalog.complete();
    fixture.detectChanges();
    expect(component.loading()).toBe(false);
    expect(component.goalsLoading()).toBe(false);
    expect(component.filtersForm.controls.trainingGoalId.enabled).toBe(true);
  });

  it('renders backend order, fields, null dates and pagination', async () => {
    await create();
    const rows = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row');
    expect(rows[0].textContent).toContain('Força A');
    expect(rows[1].textContent).toContain('Força B');
    expect(rows[0].textContent).toContain('01/10/2026');
    expect(rows[0].textContent).toContain('Em andamento');
    expect(rows[0].textContent).toContain(goals[0].name);
    expect(rows[1].textContent.match(/—/g)).toHaveLength(3);
    const paginator = fixture.debugElement.query(By.directive(MatPaginator)).componentInstance;
    expect([paginator.length, paginator.pageIndex, paginator.pageSize]).toEqual([120, 0, 20]);
  });

  it.each([
    { name: ' Força ' },
    { workoutStatus: 'COMPLETED' as WorkoutStatus },
    { trainingGoalId: 22 },
    { startDate: '2026-10-01' },
    { endDate: '2026-10-31' },
    filters,
  ])('applies supported filters through form submit: %j', async (values) => {
    await create();
    component.filtersForm.patchValue(values);
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(service.listWorkoutCycles).toHaveBeenLastCalledWith(
      0,
      20,
      expect.objectContaining({ ...values, ...('name' in values ? { name: 'Força' } : {}) }),
    );
  });

  it('paginates using applied filters and preserves page size when applying or clearing', async () => {
    await create();
    component.filtersForm.patchValue(filters);
    component.applyFilters();
    component.filtersForm.patchValue({ name: 'Edição pendente', trainingGoalId: null });
    service.listWorkoutCycles.mockReturnValueOnce(of(cyclePage(2, 50)));
    const paginator = fixture.debugElement.query(By.directive(MatPaginator))
      .componentInstance as MatPaginator;
    paginator.page.emit({ pageIndex: 2, pageSize: 50, length: 120 });
    expect(service.listWorkoutCycles).toHaveBeenLastCalledWith(2, 50, filters);
    service.listWorkoutCycles.mockReturnValue(of(cyclePage(0, 50)));
    component.applyFilters();
    expect(service.listWorkoutCycles).toHaveBeenLastCalledWith(
      0,
      50,
      expect.objectContaining({ name: 'Edição pendente' }),
    );
    component.clearFilters();
    expect(service.listWorkoutCycles).toHaveBeenLastCalledWith(0, 50, {});
    expect(component.filtersForm.getRawValue()).toEqual({
      name: '',
      workoutStatus: null,
      trainingGoalId: null,
      startDate: '',
      endDate: '',
    });
  });

  it('restores applied filters and pagination when recreated', async () => {
    await create();
    component.filtersForm.patchValue(filters);
    component.applyFilters();
    service.listWorkoutCycles.mockReturnValue(of(cyclePage(2, 50)));
    component.onPageChange({ pageIndex: 2, pageSize: 50, length: 120 });
    component.filtersForm.controls.name.setValue('Não aplicado');
    fixture.destroy();
    await create();
    expect(component.filtersForm.getRawValue()).toEqual(filters);
    expect(service.listWorkoutCycles).toHaveBeenLastCalledWith(2, 50, filters);
  });

  it('shows total empty state and retains pagination for an empty page', async () => {
    service.listWorkoutCycles.mockReturnValue(
      of({ cycles: { ...cyclePage().cycles, content: [], totalElements: 0 } }),
    );
    await create();
    expect(fixture.nativeElement.textContent).toContain('Nenhum ciclo de treino encontrado.');
    service.listWorkoutCycles.mockReturnValue(
      of({ cycles: { ...cyclePage().cycles, content: [], page: 9 } }),
    );
    component.loadCycles();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhum ciclo disponível nesta página.');
    expect(fixture.nativeElement.querySelector('mat-paginator')).not.toBeNull();
  });

  it('shows list error without stale rows and retries the same page and applied filters', async () => {
    await create();
    component.filtersForm.patchValue(filters);
    component.applyFilters();
    service.listWorkoutCycles.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'Falha na consulta' } })),
    );
    component.onPageChange({ pageIndex: 2, pageSize: 50, length: 120 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Falha na consulta',
    );
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    component.filtersForm.controls.name.setValue('Pendente');
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    fixture.detectChanges();
    expect(service.listWorkoutCycles).toHaveBeenLastCalledWith(2, 50, filters);
    expect(component.error()).toBe('');
  });

  it('keeps list usable on goal failure and recovers the selector on retry', async () => {
    service.getTrainingGoals.mockReturnValueOnce(throwError(() => new Error('offline')));
    await create();
    expect(component.goalsError()).toBe(true);
    expect(component.filtersForm.controls.trainingGoalId.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    fixture.detectChanges();
    expect(component.goalsError()).toBe(false);
    expect(component.trainingGoals()).toEqual(goals);
    expect(component.filtersForm.controls.trainingGoalId.enabled).toBe(true);
  });

  it('retains an applied goal during auxiliary failure and allows clearing it', async () => {
    TestBed.inject(WorkoutCycleCatalogStateService).filters = filters;
    service.getTrainingGoals.mockReturnValueOnce(throwError(() => new Error('offline')));
    await create();
    component.applyFilters();
    expect(service.listWorkoutCycles).toHaveBeenLastCalledWith(0, 20, filters);
    component.clearFilters();
    expect(service.listWorkoutCycles).toHaveBeenLastCalledWith(0, 20, {});
    expect(component.filtersForm.controls.trainingGoalId.disabled).toBe(true);
  });

  it('navigates from a row, its icon button and keyboard without duplicate navigation', async () => {
    await create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const row = fixture.nativeElement.querySelector('tr.mat-mdc-row');
    row.click();
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    row.dispatchEvent(space);
    expect(space.defaultPrevented).toBe(true);
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const button = row.querySelector('button');
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    button.click();
    expect(navigate).toHaveBeenCalledTimes(4);
    expect(navigate).toHaveBeenLastCalledWith(['/workout-planning', 9]);
  });

  it('cancels pending requests on destruction', async () => {
    const request = new Subject<ListWorkoutCyclesResponse>();
    service.listWorkoutCycles.mockReturnValue(request);
    await create();
    fixture.destroy();
    request.next(cyclePage());
    request.complete();
    expect(component.cycles()).toBeNull();
    expect(component.loading()).toBe(false);
  });
});
