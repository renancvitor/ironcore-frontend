import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { WorkoutDayFormComponent } from '../form/workout-day-form.component';
import { cycleDetail } from '../workout-planning.testing';
import { GetWorkoutCycleDetailResponse, WorkoutStatus } from '../workout-planning.models';
import { WorkoutCycleDetailComponent } from './workout-cycle-detail.component';

describe('Workout day composition with the HTTP service', () => {
  let fixture: ComponentFixture<WorkoutCycleDetailComponent>;
  let component: WorkoutCycleDetailComponent;
  let http: HttpTestingController;
  const dialog = { open: vi.fn() };
  const toast = { success: vi.fn() };
  const cyclesUrl = '/api/users/me/workout-cycles/9';
  const daysUrl = '/api/users/me/workout-days';
  const detail: GetWorkoutCycleDetailResponse = {
    ...cycleDetail,
    workoutStatus: 'NOT_STARTED',
    days: [
      { id: 10, title: 'Treino A', weekDay: 'MONDAY', sortOrder: 1, activities: [] },
      { id: 11, title: 'Treino B', weekDay: 'MONDAY', sortOrder: 2, activities: [] },
      { id: 12, title: 'Treino C', weekDay: 'FRIDAY', sortOrder: 1, activities: [] },
    ],
  };

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

  async function create(status: WorkoutStatus = 'NOT_STARTED', data = detail) {
    fixture = TestBed.createComponent(WorkoutCycleDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(cyclesUrl).flush({ ...data, workoutStatus: status });
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function click(label: string) {
    fixture.nativeElement.querySelector(`[aria-label="${label}"]`).click();
    fixture.detectChanges();
  }

  function editor() {
    return fixture.debugElement.query(By.directive(WorkoutDayFormComponent))
      .componentInstance as WorkoutDayFormComponent;
  }

  function refresh(data: GetWorkoutCycleDetailResponse) {
    expect(component.daySaving()).toBe(false);
    expect(component.daysLoading()).toBe(true);
    expect(component.dayBusy()).toBe(true);
    component.openDayForm('create');
    component.startEdit();
    component.deleteDay(detail.days[0]);
    expect(component.dayMode()).toBeNull();
    expect(component.editing()).toBe(false);
    http.expectOne(cyclesUrl).flush(data);
    fixture.detectChanges();
    expect(component.daySaving()).toBe(false);
    expect(component.daysLoading()).toBe(false);
    expect(component.dayBusy()).toBe(false);
    expect(component.cycle()).toEqual(data);
  }

  it('creates with weekday and title, then reads the persisted composition without assigning sortOrder', async () => {
    await create('NOT_STARTED', { ...detail, days: [] });
    expect(fixture.nativeElement.textContent).toContain('Nenhum dia de treino neste ciclo.');
    click('Adicionar dia de treino');
    const form = editor();
    form.form().patchValue({ title: '  Treino novo  ', weekDay: 'SATURDAY' });
    form.submit();
    const request = http.expectOne(daysUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      workoutCycleId: 9,
      weekDay: 'SATURDAY',
      title: 'Treino novo',
    });
    fixture.detectChanges();
    expect(form.form().disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Salvando',
    );
    component.saveDay();
    component.cancelDayForm();
    component.startEdit();
    expect(component.dayMode()).toBe('create');
    expect(component.editing()).toBe(false);
    http.expectNone(daysUrl);
    request.flush({ id: 15, sortOrder: 7 });
    expect(component.cycle()?.days).toEqual([]);
    refresh({
      ...detail,
      days: [
        { id: 15, title: 'Título persistido', weekDay: 'SATURDAY', sortOrder: 7, activities: [] },
      ],
    });
    expect(fixture.nativeElement.textContent).toContain('Título persistido');
    expect(component.cycle()?.days[0].sortOrder).toBe(7);
    expect(component.dayMode()).toBeNull();
    expect(toast.success).toHaveBeenCalledWith('Dia de treino criado com sucesso.');
  });

  it('populates editing and sends only title, using the refreshed detail', async () => {
    await create('IN_PROGRESS');
    click('Editar dia Treino A');
    expect(editor().form().controls.title.value).toBe('Treino A');
    expect(fixture.nativeElement.querySelector('mat-select')).toBeNull();
    editor().form().controls.title.setValue('Novo título');
    editor().submit();
    const request = http.expectOne(`${daysUrl}/10`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ title: 'Novo título' });
    request.flush({ title: 'Resposta parcial' });
    refresh({
      ...detail,
      days: [{ ...detail.days[0], title: 'Título da composição' }, ...detail.days.slice(1)],
    });
    expect(fixture.nativeElement.textContent).toContain('Título da composição');
    expect(toast.success).toHaveBeenCalledWith('Dia de treino atualizado com sucesso.');
  });

  it('cancels a draft without a mutation', async () => {
    await create();
    click('Editar dia Treino A');
    editor().form().controls.title.setValue('Rascunho');
    editor().cancelled.emit();
    fixture.detectChanges();
    expect(component.dayMode()).toBeNull();
    expect(component.cycle()).toEqual(detail);
    http.expectNone((request) => request.method !== 'GET');
  });

  it.each([false, undefined])('does not delete when confirmation returns %s', async (confirmed) => {
    dialog.open.mockReturnValue(of(confirmed));
    await create();
    click('Excluir dia Treino A');
    expect(dialog.open).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Excluir dia de treino',
        primaryAction: 'Excluir',
        secondaryAction: 'Cancelar',
        message: expect.stringContaining('Esta ação não pode ser desfeita.'),
      }),
    );
    http.expectNone(`${daysUrl}/10`);
    expect(component.dayBusy()).toBe(false);
  });

  it('blocks duplicate confirmation and deletes after confirmation, retaining backend sortOrder', async () => {
    const confirmation = new Subject<boolean>();
    dialog.open.mockReturnValue(confirmation);
    await create();
    click('Excluir dia Treino A');
    component.deleteDay(detail.days[0]);
    component.openDayForm('create');
    component.startEdit();
    expect(component.dayMode()).toBeNull();
    expect(component.editing()).toBe(false);
    expect(dialog.open).toHaveBeenCalledTimes(1);
    confirmation.next(true);
    confirmation.complete();
    const request = http.expectOne(`${daysUrl}/10`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    refresh({ ...detail, days: [{ ...detail.days[1], sortOrder: 1 }, detail.days[2]] });
    expect(component.cycle()?.days.map((day) => day.id)).toEqual([11, 12]);
    expect(toast.success).toHaveBeenCalledWith('Dia de treino excluído com sucesso.');
  });

  it.each([
    ['MONDAY', 2],
    ['FRIDAY', 2],
    ['SUNDAY', 1],
  ] as const)(
    'reorders to %s position %s and reads the backend result',
    async (weekDay, sortOrder) => {
      await create('IN_PROGRESS');
      click('Reordenar dia Treino A');
      const form = editor();
      expect(form.form().controls.weekDay.value).toBe('MONDAY');
      expect(form.form().controls.sortOrder.value).toBe(1);
      form.form().patchValue({ weekDay, sortOrder });
      form.submit();
      const request = http.expectOne(`${daysUrl}/10/reorder`);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ weekDay, sortOrder });
      expect(component.cycle()?.days).toEqual(detail.days);
      request.flush(null, { status: 204, statusText: 'No Content' });
      refresh({ ...detail, days: [{ ...detail.days[0], weekDay, sortOrder }] });
      expect(toast.success).toHaveBeenCalledWith('Dia de treino reordenado com sucesso.');
    },
  );

  it('sorts Sunday through Saturday then sortOrder without changing persisted values or arrays', async () => {
    const days = [
      { ...detail.days[0], id: 1, weekDay: 'SATURDAY' as const, sortOrder: 4 },
      { ...detail.days[0], id: 2, weekDay: 'MONDAY' as const, sortOrder: 8 },
      { ...detail.days[0], id: 3, weekDay: 'SUNDAY' as const, sortOrder: 5 },
      { ...detail.days[0], id: 4, weekDay: 'MONDAY' as const, sortOrder: 2 },
    ];
    await create('NOT_STARTED', { ...detail, days });
    expect(component.orderedDays().map((day) => [day.id, day.sortOrder])).toEqual([
      [3, 5],
      [4, 2],
      [2, 8],
      [1, 4],
    ]);
    expect(component.cycle()?.days).toEqual(days);
    expect(
      Array.from(
        fixture.nativeElement.querySelectorAll(
          '.ic-workout-detail__day-header h3',
        ) as NodeListOf<HTMLElement>,
      ).map((el) => el.id),
    ).toEqual(['workout-day-3', 'workout-day-4', 'workout-day-2', 'workout-day-1']);
  });

  it.each(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const)(
    'enforces all mutations in %s',
    async (status) => {
      await create(status);
      const allowed = status === 'NOT_STARTED' || status === 'IN_PROGRESS';
      for (const label of [
        'Adicionar dia de treino',
        'Editar dia Treino A',
        'Reordenar dia Treino A',
        'Excluir dia Treino A',
      ]) {
        expect(!!fixture.nativeElement.querySelector(`[aria-label="${label}"]`)).toBe(allowed);
      }
      if (!allowed) {
        for (const mode of ['create', 'edit', 'reorder'] as const) {
          component.openDayForm(mode, detail.days[0]);
          component.saveDay();
          expect(component.dayMode()).toBeNull();
        }
        component.deleteDay(detail.days[0]);
        expect(dialog.open).not.toHaveBeenCalled();
        http.expectNone((request) => request.method !== 'GET');
      }
    },
  );

  it.each(['create', 'edit', 'reorder', 'delete'] as const)(
    'shows API errors for %s and keeps the persisted composition and draft',
    async (mode) => {
      await create();
      if (mode === 'delete') component.deleteDay(detail.days[0]);
      else {
        component.openDayForm(mode, mode === 'create' ? null : detail.days[0]);
        fixture.detectChanges();
        editor().form().controls.title.setValue('Rascunho');
        editor().submit();
      }
      const request = http.expectOne((request) => request.url.startsWith(daysUrl));
      request.flush(
        { message: 'Regra do backend.' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      fixture.detectChanges();
      expect(dialog.open).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: 'Regra do backend.' }),
      );
      expect(component.daySaving()).toBe(false);
      expect(component.daysLoading()).toBe(false);
      expect(component.cycle()).toEqual(detail);
      expect(toast.success).not.toHaveBeenCalled();
      http.expectNone(cyclesUrl);
      if (mode !== 'delete') {
        expect(component.dayMode()).toBe(mode);
        expect(editor().form().controls.title.value).toBe('Rascunho');
        expect(editor().form().enabled).toBe(true);
      }
    },
  );

  it('reports a saved mutation followed by reload failure and retries only GET', async () => {
    await create();
    click('Excluir dia Treino A');
    http.expectOne(`${daysUrl}/10`).flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(cyclesUrl).flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'A alteração foi salva',
    );
    expect(component.daySaving()).toBe(false);
    expect(component.daysLoading()).toBe(false);
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('Dia de treino excluído com sucesso.');
    expect(dialog.open).toHaveBeenCalledTimes(1);
    component.openDayForm('create');
    expect(component.dayMode()).toBeNull();
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    http.expectOne(cyclesUrl).flush({ ...detail, days: [] });
    fixture.detectChanges();
    http.expectNone((request) => request.method !== 'GET');
    expect(component.error()).toBe('');
  });

  it.each(['create', 'edit'] as const)(
    'rejects a whitespace title before %s without calling the API',
    async (mode) => {
      await create();
      component.openDayForm(mode, mode === 'create' ? null : detail.days[0]);
      fixture.detectChanges();
      editor().form().controls.title.setValue('   ');
      editor().submit();
      fixture.detectChanges();
      expect(component.dayForm.invalid).toBe(true);
      expect(component.dayForm.controls.title.touched).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Informe o título.');
      http.expectNone((request) => request.method !== 'GET');
    },
  );

  it('rejects an invalid reorder position before calling the API', async () => {
    await create();
    component.openDayForm('reorder', detail.days[0]);
    fixture.detectChanges();
    for (const sortOrder of [0, -1, 1.5, 3]) {
      editor().form().controls.sortOrder.setValue(sortOrder);
      editor().submit();
      expect(component.dayForm.controls.sortOrder.invalid).toBe(true);
      expect(component.dayForm.controls.sortOrder.touched).toBe(true);
    }
    http.expectNone((request) => request.method !== 'GET');
  });
});
