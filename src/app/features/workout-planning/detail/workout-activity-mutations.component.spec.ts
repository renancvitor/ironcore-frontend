import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ExerciseCatalogComponent } from '../../exercise/catalog/exercise-catalog.component';
import { ExerciseCatalogStateService } from '../../exercise/catalog/exercise-catalog-state.service';
import { ListExercisesItemResponse } from '../../exercise/exercise.models';
import { cycleDetail } from '../workout-planning.testing';
import { GetWorkoutCycleDetailResponse, WorkoutStatus } from '../workout-planning.models';
import { WorkoutCycleDetailComponent } from './workout-cycle-detail.component';

describe('Workout activities and existing Exercise Catalog integration', () => {
  let fixture: ComponentFixture<WorkoutCycleDetailComponent>;
  let component: WorkoutCycleDetailComponent;
  let http: HttpTestingController;
  const dialog = { open: vi.fn() };
  const toast = { success: vi.fn() };
  const cycleUrl = '/api/users/me/workout-cycles/9';
  const activitiesUrl = '/api/users/me/workout-activities';
  const catalogUrl = '/api/exercise-catalog';
  const detail = structuredClone(cycleDetail);
  const day = detail.days[0];
  const activity = day.activities[0];
  const exercises: ListExercisesItemResponse[] = [50, 70, 71].map((id) => ({
    id,
    name: `Exercício ${id}`,
    activityType: { id: 1, code: 'STRENGTH', name: 'Força' },
    equipmentType: { id: 2, code: 'BARBELL', name: 'Barra' },
    unilateral: false,
    compound: true,
    suggestedRestSeconds: 90,
  }));

  beforeEach(async () => {
    vi.resetAllMocks();
    dialog.open.mockReturnValue(of(true));
    await TestBed.configureTestingModule({
      imports: [WorkoutCycleDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '' },
        { provide: DialogService, useValue: dialog },
        { provide: ToastService, useValue: toast },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '9' }) } },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  async function create(status: WorkoutStatus = 'IN_PROGRESS') {
    fixture = TestBed.createComponent(WorkoutCycleDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(cycleUrl).flush({ ...detail, workoutStatus: status });
    await fixture.whenStable();
    fixture.detectChanges();
  }
  function click(label: string) {
    fixture.nativeElement.querySelector(`[aria-label="${label}"]`).click();
    fixture.detectChanges();
  }
  function catalog() {
    return fixture.debugElement.query(By.directive(ExerciseCatalogComponent))
      .componentInstance as ExerciseCatalogComponent;
  }
  function catalogPage(content = exercises, page = 0) {
    return {
      exercises: { content, page, size: 20, totalElements: 40, totalPages: 2, last: false },
    };
  }
  function openSelector() {
    click(`Adicionar atividades ao dia ${day.title}`);
    http.expectOne(`${catalogUrl}/exercises?page=0&size=20`).flush(catalogPage());
    for (const path of ['activity-types', 'equipment-types', 'muscle-groups', 'muscle-subgroups']) {
      http.expectOne(`${catalogUrl}/${path}`).flush([]);
    }
    fixture.detectChanges();
    return catalog();
  }
  function selectExercises(selected = exercises.slice(1)) {
    const selector = openSelector();
    for (const exercise of selected) selector.toggleExercise(exercise);
    selector.confirmSelection();
    fixture.detectChanges();
  }
  function reload(data: GetWorkoutCycleDetailResponse = detail) {
    expect(component.activitiesLoading()).toBe(true);
    expect(component.activitySaving()).toBe(false);
    http.expectOne(cycleUrl).flush(data);
    fixture.detectChanges();
  }

  it('opens the real catalog on the page, isolates browse filter state, excludes duplicates and cancels without mutation', async () => {
    await create();
    TestBed.inject(ExerciseCatalogStateService).filters = { name: 'Busca normal' };
    const selector = openSelector();
    expect(selector.mode()).toBe('select');
    expect(selector.filtersForm.controls.name.value).toBe('');
    expect(fixture.nativeElement.querySelector('app-dialog')).toBeNull();
    expect(selector.excludedExerciseIds()).toEqual([50, 51]);
    const duplicate = fixture.nativeElement.querySelector('mat-checkbox input') as HTMLInputElement;
    expect(duplicate.disabled).toBe(true);
    selector.toggleExercise(exercises[0]);
    selector.confirmSelection();
    expect(component.activityMode()).toBe('select');
    expect(selector.selectedExercises()).toEqual([]);
    selector.selectionCancelled.emit();
    fixture.detectChanges();
    expect(component.activityMode()).toBeNull();
    expect(component.cycle()).toEqual(detail);
    http.expectNone((req) => req.method !== 'GET');
  });

  it('reuses search and every filter, retains multiple selections through pagination and confirms only on demand', async () => {
    await create();
    const selector = openSelector();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    selector.openExercise(70);
    selector.filtersForm.patchValue({
      name: '  Remada ',
      activityTypeIds: [1],
      equipmentTypeIds: [2],
      muscleGroupIds: [3],
      muscleSubgroupIds: [4],
      targetRoles: ['PRIMARY', 'SECONDARY'],
    });
    selector.applyFilters();
    const search = http.expectOne((req) => req.url === `${catalogUrl}/exercises`);
    expect(search.request.params.get('name')).toBe('Remada');
    for (const [key, value] of [
      ['activityTypeIds', '1'],
      ['equipmentTypeIds', '2'],
      ['muscleGroupIds', '3'],
      ['muscleSubgroupIds', '4'],
    ]) {
      expect(search.request.params.get(key)).toBe(value);
    }
    expect(search.request.params.getAll('targetRoles')).toEqual(['PRIMARY', 'SECONDARY']);
    search.flush(catalogPage([exercises[2]]));
    selector.onPageChange({ pageIndex: 1, pageSize: 20, length: 40 });
    const page = http.expectOne((req) => req.url === `${catalogUrl}/exercises`);
    expect(page.request.params.get('page')).toBe('1');
    expect(page.request.params.get('name')).toBe('Remada');
    page.flush(catalogPage([exercises[2]], 1));
    fixture.detectChanges();
    const checkbox = fixture.nativeElement.querySelector('mat-checkbox input') as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();
    expect(selector.selectedIds()).toEqual([70, 71]);
    expect(navigate).not.toHaveBeenCalled();
    expect(component.activityMode()).toBe('select');
    selector.confirmSelection();
    fixture.detectChanges();
    expect(component.activityMode()).toBe('create');
    expect(component.activityExercises().map((item) => item.id)).toEqual([70, 71]);
    expect(fixture.nativeElement.querySelector('app-workout-activity-form').textContent).toContain(
      'mais 1',
    );
  });

  it('supports keyboard selection without double toggling checkbox events and keeps selections when clearing filters', async () => {
    await create();
    const selector = openSelector();
    const rows = fixture.nativeElement.querySelectorAll(
      '.ic-exercise-catalog__row',
    ) as NodeListOf<HTMLElement>;
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    rows[1].dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(selector.selectedIds()).toEqual([70]);
    const checkbox = rows[2].querySelector('input')!;
    checkbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(selector.selectedIds()).toEqual([70]);
    selector.clearFilters();
    http.expectOne(`${catalogUrl}/exercises?page=0&size=20`).flush(catalogPage());
    expect(selector.selectedIds()).toEqual([70]);
  });

  it('blocks a known duplicate again at save time and allows the same exercise in another day', async () => {
    await create();
    selectExercises([exercises[1]]);
    component.activityExercises.set([activity.exercise]);
    component.saveActivity();
    http.expectNone(activitiesUrl);
    expect(dialog.open).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Exercício já adicionado' }),
    );
    component.cancelActivityForm();
    component.openActivitySelector(detail.days[1]);
    expect(component.excludedExerciseIds()).toEqual([]);
    component.confirmExercises([exercises[0]]);
    component.saveActivity();
    const request = http.expectOne(activitiesUrl);
    expect(request.request.body.workoutDayId).toBe(detail.days[1].id);
    expect(request.request.body.exerciseId).toBe(50);
    request.flush({});
    reload();
  });

  it('cancels exercise replacement while retaining the edited prescription and original exercise', async () => {
    await create();
    component.openActivityForm('edit', day, activity);
    component.activityForm.controls.durationMinutes.setValue(30);
    component.changeActivityExercise();
    component.cancelActivitySelection();
    expect(component.activityMode()).toBe('edit');
    expect(component.activityExercises()[0].id).toBe(activity.exercise.id);
    expect(component.activityForm.controls.durationMinutes.value).toBe(30);
    component.cancelActivityForm();
    expect(component.activityMode()).toBeNull();
    expect(component.cycle()).toEqual(detail);
    http.expectNone((req) => req.method !== 'GET');
  });

  it('marks invalid prescription inputs and does not call the API', async () => {
    await create();
    component.openActivityForm('edit', day, activity);
    component.activityForm.patchValue({ repRangeMin: 15, repRangeMax: 8, sets: 0 });
    component.saveActivity();
    fixture.detectChanges();
    expect(component.activityForm.controls.sets.touched).toBe(true);
    expect(component.activityForm.hasError('repRange')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'O mínimo de repetições não pode ser maior que o máximo.',
    );
    http.expectNone((req) => req.method !== 'GET');
  });

  it('creates each selected exercise with its own hybrid prescription and reloads after every success', async () => {
    await create();
    selectExercises();
    component.activityForm.patchValue({
      sets: 3,
      repRangeMin: 8,
      repRangeMax: 12,
      targetLoadKg: 0.25,
      targetLoadText: ' RPE 8 ',
      durationMinutes: 10,
      distanceKm: 0.75,
      intensityText: ' Moderada ',
      restSeconds: 60,
      notes: ' Técnica ',
    });
    component.saveActivity();
    const first = http.expectOne(activitiesUrl);
    expect(first.request.body).toEqual({
      workoutDayId: day.id,
      exerciseId: 70,
      sets: 3,
      repRangeMin: 8,
      repRangeMax: 12,
      targetLoadKg: 0.25,
      targetLoadText: 'RPE 8',
      durationMinutes: 10,
      distanceKm: 0.75,
      intensityText: 'Moderada',
      restSeconds: 60,
      notes: 'Técnica',
    });
    expect(first.request.body.orderIndex).toBeUndefined();
    expect(component.activityForm.disabled).toBe(true);
    component.saveActivity();
    component.cancelActivityForm();
    component.openDayForm('create');
    component.startEdit();
    expect(component.activityMode()).toBe('create');
    expect(component.dayMode()).toBeNull();
    expect(component.editing()).toBe(false);
    first.flush({ id: 80, orderIndex: 3 });
    expect(component.cycle()).toEqual(detail);
    reload();
    expect(component.activityMode()).toBe('create');
    expect(component.activityExercises()[0].id).toBe(71);
    expect(component.activityForm.controls.sets.value).toBeNull();
    component.saveActivity();
    const second = http.expectOne(activitiesUrl);
    expect(second.request.body).toEqual({
      workoutDayId: day.id,
      exerciseId: 71,
      sets: null,
      repRangeMin: null,
      repRangeMax: null,
      targetLoadKg: null,
      targetLoadText: null,
      durationMinutes: null,
      distanceKm: null,
      intensityText: null,
      restSeconds: null,
      notes: null,
    });
    second.flush({ id: 81 });
    reload();
    expect(component.activityMode()).toBeNull();
    expect(toast.success).toHaveBeenCalledTimes(2);
  });

  it('edits all fields, clears optional fields with null and preserves the draft when replacing the exercise', async () => {
    await create();
    click(`Editar atividade ${activity.exercise.name}`);
    expect(component.activityForm.getRawValue()).toEqual({
      sets: 4,
      repRangeMin: 8,
      repRangeMax: 12,
      targetLoadKg: 22.5,
      targetLoadText: 'Carga confortável',
      durationMinutes: 15,
      distanceKm: 2.5,
      intensityText: 'Moderada',
      restSeconds: 90,
      notes: 'Execução controlada',
    });
    component.activityForm.patchValue({ sets: null, targetLoadText: '  ', durationMinutes: 25 });
    component.changeActivityExercise();
    fixture.detectChanges();
    http.expectOne(`${catalogUrl}/exercises?page=0&size=20`).flush(catalogPage());
    for (const path of ['activity-types', 'equipment-types', 'muscle-groups', 'muscle-subgroups'])
      http.expectOne(`${catalogUrl}/${path}`).flush([]);
    fixture.detectChanges();
    expect(catalog().multiple()).toBe(false);
    expect(catalog().excludedExerciseIds()).toEqual([51]);
    catalog().toggleExercise(exercises[1]);
    catalog().toggleExercise(exercises[2]);
    expect(catalog().selectedIds()).toEqual([71]);
    catalog().confirmSelection();
    fixture.detectChanges();
    expect(component.activityForm.controls.durationMinutes.value).toBe(25);
    component.saveActivity();
    const request = http.expectOne(`${activitiesUrl}/${activity.id}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(
      expect.objectContaining({
        exerciseId: 71,
        sets: null,
        targetLoadText: null,
        durationMinutes: 25,
        targetLoadKg: 22.5,
        distanceKm: 2.5,
      }),
    );
    expect(request.request.body.workoutDayId).toBeUndefined();
    request.flush({});
    reload();
    expect(toast.success).toHaveBeenCalledWith('Atividade atualizada com sucesso.');
  });

  it.each([false, undefined])('does not delete after confirmation %s', async (answer) => {
    await create();
    dialog.open.mockReturnValue(of(answer));
    click(`Excluir atividade ${activity.exercise.name}`);
    http.expectNone((req) => req.method === 'DELETE');
    expect(component.activityBusy()).toBe(false);
  });

  it('confirms deletion once, blocks competing mutations and uses refreshed backend order', async () => {
    await create();
    const confirmation = new Subject<boolean>();
    dialog.open.mockReturnValue(confirmation);
    click(`Excluir atividade ${activity.exercise.name}`);
    component.deleteActivity(day, activity);
    component.openActivitySelector(day);
    component.openDayForm('create');
    expect(component.activityMode()).toBeNull();
    expect(component.dayMode()).toBeNull();
    expect(dialog.open).toHaveBeenCalledTimes(1);
    confirmation.next(true);
    confirmation.complete();
    const request = http.expectOne(`${activitiesUrl}/${activity.id}`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    const updated = {
      ...detail,
      days: [{ ...day, activities: [{ ...day.activities[1], orderIndex: 5 }] }],
    };
    reload(updated);
    expect(component.cycle()).toEqual(updated);
    expect(toast.success).toHaveBeenCalledWith('Atividade excluída com sucesso.');
  });

  it('reorders by destination without renumbering or sorting the returned array', async () => {
    await create();
    click(`Reordenar atividade ${activity.exercise.name}`);
    for (const orderIndex of [0, -1, 1.5, 3, NaN]) {
      component.activityOrderForm.controls.orderIndex.setValue(orderIndex);
      component.saveActivity();
      http.expectNone(`${activitiesUrl}/${activity.id}/reorder`);
    }
    component.activityOrderForm.controls.orderIndex.setValue(2);
    component.saveActivity();
    const request = http.expectOne(`${activitiesUrl}/${activity.id}/reorder`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ orderIndex: 2 });
    request.flush(null);
    const returned = [
      { ...day.activities[1], orderIndex: 9 },
      { ...activity, orderIndex: 2 },
    ];
    reload({ ...detail, days: [{ ...day, activities: returned }] });
    expect(
      Array.from(fixture.nativeElement.querySelectorAll('h4') as NodeListOf<HTMLElement>).map(
        (item) => item.textContent!.trim(),
      ),
    ).toEqual(returned.map((item) => item.exercise.name));
    expect(component.cycle()?.days[0].activities).toEqual(returned);
  });

  it.each(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const)(
    'enforces permissions for %s',
    async (status) => {
      await create(status);
      const allowed = status === 'NOT_STARTED' || status === 'IN_PROGRESS';
      for (const label of [
        `Adicionar atividades ao dia ${day.title}`,
        `Editar atividade ${activity.exercise.name}`,
        `Reordenar atividade ${activity.exercise.name}`,
        `Excluir atividade ${activity.exercise.name}`,
      ]) {
        expect(!!fixture.nativeElement.querySelector(`[aria-label="${label}"]`)).toBe(allowed);
      }
      if (!allowed) {
        component.openActivitySelector(day);
        component.openActivityForm('edit', day, activity);
        component.openActivityForm('reorder', day, activity);
        component.deleteActivity(day, activity);
        component.saveActivity();
        expect(component.activityMode()).toBeNull();
        expect(dialog.open).not.toHaveBeenCalled();
        http.expectNone((req) => req.method !== 'GET');
      }
    },
  );

  it.each(['create', 'edit', 'delete', 'reorder'] as const)(
    'keeps operation errors separate from reload for %s, including backend duplicate messages',
    async (mode) => {
      await create();
      if (mode === 'create') {
        selectExercises([exercises[1]]);
        component.saveActivity();
      } else if (mode === 'delete') component.deleteActivity(day, activity);
      else {
        component.openActivityForm(mode, day, activity);
        component.saveActivity();
      }
      http
        .expectOne((req) => req.url.startsWith(activitiesUrl))
        .flush(
          { message: 'Exercício já está vinculado a este dia de treino.' },
          { status: 422, statusText: 'Unprocessable Entity' },
        );
      fixture.detectChanges();
      expect(dialog.open).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: 'Exercício já está vinculado a este dia de treino.' }),
      );
      expect(component.activityBusy()).toBe(false);
      expect(component.cycle()).toEqual(detail);
      expect(toast.success).not.toHaveBeenCalled();
      http.expectNone(cycleUrl);
      if (mode !== 'delete') {
        expect(component.activityMode()).toBe(mode);
        expect(component.activityForm.enabled).toBe(true);
      }
    },
  );

  it('reports reload failure after success and retries only the composition query', async () => {
    await create();
    selectExercises();
    component.saveActivity();
    http.expectOne(activitiesUrl).flush({ id: 80 });
    http.expectOne(cycleUrl).flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'A alteração foi salva',
    );
    expect(component.activityBusy()).toBe(false);
    expect(component.activityMode()).toBeNull();
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('Atividade criada com sucesso.');
    expect(dialog.open).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    http.expectOne(cycleUrl).flush(detail);
    fixture.detectChanges();
    expect(component.error()).toBe('');
    http.expectNone((req) => req.method !== 'GET');
  });

  it('keeps selection query errors in context and recovers without leaving the cycle', async () => {
    await create();
    click(`Adicionar atividades ao dia ${day.title}`);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    for (const path of ['activity-types', 'equipment-types', 'muscle-groups', 'muscle-subgroups'])
      http.expectOne(`${catalogUrl}/${path}`).flush([]);
    http
      .expectOne(`${catalogUrl}/exercises?page=0&size=20`)
      .flush({ message: 'Falha no catálogo.' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Falha no catálogo.',
    );
    expect(navigate).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    http.expectOne(`${catalogUrl}/exercises?page=0&size=20`).flush(catalogPage());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
  });
});
