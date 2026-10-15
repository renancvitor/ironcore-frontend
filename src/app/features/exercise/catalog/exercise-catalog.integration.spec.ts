import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { By } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ListExercisesItemResponse, ListExercisesResponse } from '../exercise.models';
import { ExerciseCatalogComponent } from './exercise-catalog.component';

describe('Exercise catalog HTTP integration', () => {
  const baseUrl = '/api/exercise-catalog';
  const exercise: ListExercisesItemResponse = {
    id: 10,
    name: 'Supino reto',
    activityType: { id: 1, code: 'STRENGTH', name: 'Força' },
    equipmentType: { id: 2, code: 'BARBELL', name: 'Barra' },
    unilateral: false,
    compound: true,
    suggestedRestSeconds: 90,
  };
  const page: ListExercisesResponse = {
    exercises: {
      content: [exercise],
      page: 0,
      size: 20,
      totalElements: 45,
      totalPages: 3,
      last: false,
    },
  };
  const catalogs = [
    [
      'activity-types',
      'activityTypeIds',
      [{ id: 1, code: 'STRENGTH', name: 'Força' }],
      'tipos de atividade',
    ],
    [
      'equipment-types',
      'equipmentTypeIds',
      [{ id: 2, code: 'BARBELL', name: 'Barra' }],
      'equipamentos',
    ],
    [
      'muscle-groups',
      'muscleGroupIds',
      [{ id: 3, code: 'CHEST', name: 'Peitoral' }],
      'grupos musculares',
    ],
    [
      'muscle-subgroups',
      'muscleSubgroupIds',
      [{ id: 4, code: 'CHEST', muscleGroupId: 3, name: 'Peitoral maior' }],
      'subgrupos musculares',
    ],
  ] as const;
  let fixture: ComponentFixture<ExerciseCatalogComponent>;
  let http: HttpTestingController;
  let closed: Subject<boolean>;
  const openDialog = vi.fn();
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    closed = new Subject();
    openDialog.mockReset().mockReturnValue(closed.asObservable());
    await TestBed.configureTestingModule({
      imports: [ExerciseCatalogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '' },
        { provide: DialogService, useValue: { open: openDialog } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ExerciseCatalogComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function flushCatalogs(): void {
    for (const [path, , data] of catalogs) http.expectOne(`${baseUrl}/${path}`).flush([...data]);
  }

  function flushInitial(value = page): void {
    http.expectOne(`${baseUrl}/exercises?page=0&size=20`).flush(value);
    flushCatalogs();
    fixture.detectChanges();
  }

  it('shows loading, disables catalog selectors and blocks duplicate submissions', () => {
    expect(fixture.nativeElement.querySelector('app-loading')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Carregando opções',
    );
    for (const [, field] of catalogs)
      expect(fixture.componentInstance.filtersForm.controls[field].disabled).toBe(true);
    const buttons = fixture.nativeElement.querySelectorAll(
      '.ic-exercise-catalog__filters-actions button',
    ) as NodeListOf<HTMLButtonElement>;
    expect(Array.from(buttons).every((button) => button.disabled)).toBe(true);
    fixture.componentInstance.applyFilters();
    fixture.componentInstance.clearFilters();
    flushInitial();
    expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.ic-exercise-catalog__filters [role="status"]'),
    ).toBeNull();
    for (const [, field] of catalogs)
      expect(fixture.componentInstance.filtersForm.controls[field].enabled).toBe(true);
  });

  it('renders classifications, boolean indicators, rest and backend pagination', () => {
    flushInitial();
    const cells = Array.from(
      fixture.nativeElement.querySelectorAll('td') as NodeListOf<HTMLElement>,
    ).map((el) => el.textContent!.trim());
    expect(cells).toEqual(['Supino reto', 'Força', 'Barra', 'Não', 'Sim', '90 s']);
    const paginator = fixture.debugElement.query(By.directive(MatPaginator))
      .componentInstance as MatPaginator;
    expect([paginator.length, paginator.pageIndex, paginator.pageSize]).toEqual([45, 0, 20]);
    fixture.nativeElement.querySelector('.ic-exercise-catalog__row').click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/exercise', 10]);
  });

  it('submits all filters through the form and paginates with applied values', () => {
    flushInitial();
    const form = fixture.componentInstance.filtersForm;
    form.patchValue({
      name: ' Supino & halteres ',
      activityTypeIds: [1, 2],
      equipmentTypeIds: [2, 3],
      muscleGroupIds: [3],
      muscleSubgroupIds: [4],
      targetRoles: ['PRIMARY', 'STABILIZER'],
    });
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = http.expectOne((req) => req.url === `${baseUrl}/exercises`);
    expect(request.request.params.get('name')).toBe('Supino & halteres');
    expect(request.request.params.getAll('activityTypeIds')).toEqual(['1', '2']);
    expect(request.request.params.getAll('equipmentTypeIds')).toEqual(['2', '3']);
    expect(request.request.params.getAll('muscleGroupIds')).toEqual(['3']);
    expect(request.request.params.getAll('muscleSubgroupIds')).toEqual(['4']);
    expect(request.request.params.getAll('targetRoles')).toEqual(['PRIMARY', 'STABILIZER']);
    expect(request.request.params.get('page')).toBe('0');
    request.flush(page);
    fixture.detectChanges();
    form.patchValue({ name: 'Remada', equipmentTypeIds: [99] });
    const paginator = fixture.debugElement.query(By.directive(MatPaginator))
      .componentInstance as MatPaginator;
    paginator.page.emit({ pageIndex: 1, pageSize: 20, length: 45 });
    const next = http.expectOne((req) => req.url === `${baseUrl}/exercises`);
    expect(next.request.params.get('page')).toBe('1');
    expect(next.request.params.get('name')).toBe('Supino & halteres');
    expect(next.request.params.getAll('equipmentTypeIds')).toEqual(['2', '3']);
    next.flush({ exercises: { ...page.exercises, page: 1 } });
    fixture.detectChanges();
    fixture.destroy();
    fixture = TestBed.createComponent(ExerciseCatalogComponent);
    fixture.detectChanges();
    const restored = http.expectOne((req) => req.url === `${baseUrl}/exercises`);
    expect(restored.request.params.get('page')).toBe('1');
    expect(restored.request.params.get('name')).toBe('Supino & halteres');
    expect(fixture.componentInstance.filtersForm.controls.equipmentTypeIds.value).toEqual([2, 3]);
    restored.flush({ exercises: { ...page.exercises, page: 1 } });
    flushCatalogs();
  });

  it('clears filters through the button, resets pagination and preserves page size', () => {
    flushInitial({ exercises: { ...page.exercises, page: 2, size: 50 } });
    fixture.componentInstance.filtersForm.patchValue({
      name: 'Supino',
      muscleGroupIds: [3],
      muscleSubgroupIds: [4],
      targetRoles: ['PRIMARY'],
    });
    fixture.nativeElement
      .querySelector('.ic-exercise-catalog__filters-actions button[type="button"]')
      .click();
    http.expectOne(`${baseUrl}/exercises?page=0&size=50`).flush(page);
    expect(fixture.componentInstance.filtersForm.controls.name.value).toBe('');
    expect(fixture.componentInstance.filtersForm.controls.muscleSubgroupIds.value).toEqual([]);
  });

  it.each([
    [0, 'Nenhum exercício encontrado.', false],
    [45, 'Nenhum exercício disponível nesta página.', true],
  ])('renders an empty state with totalElements=%s', (totalElements, message, hasPaginator) => {
    flushInitial({ exercises: { ...page.exercises, content: [], totalElements } });
    expect(fixture.nativeElement.querySelector('app-empty-state').textContent).toContain(message);
    expect(!!fixture.nativeElement.querySelector('mat-paginator')).toBe(hasPaginator);
  });

  it('renders a placeholder for unspecified rest and supports keyboard navigation', () => {
    flushInitial({
      exercises: {
        ...page.exercises,
        content: [{ ...exercise, suggestedRestSeconds: null, unilateral: true, compound: false }],
      },
    });
    const text = fixture.nativeElement.querySelector('tbody').textContent;
    expect(text).toContain('—');
    const row = fixture.nativeElement.querySelector('.ic-exercise-catalog__row');
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(navigate).toHaveBeenCalledWith(['/exercise', 10]);
    navigate.mockClear();
    row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/exercise', 10]);
  });

  it.each(catalogs)('reports and recovers from a failed %s request', (path, field, data, label) => {
    http.expectOne(`${baseUrl}/exercises?page=0&size=20`).flush(page);
    for (const [otherPath, , otherData] of catalogs) {
      const request = http.expectOne(`${baseUrl}/${otherPath}`);
      if (otherPath === path) request.flush({}, { status: 500, statusText: 'Server Error' });
      else request.flush([...otherData]);
    }
    fixture.detectChanges();
    expect(fixture.componentInstance.filtersForm.controls[field].disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      `Não foi possível carregar ${label}.`,
    );
    expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    flushCatalogs();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.componentInstance.filtersForm.controls[field].enabled).toBe(true);
  });

  it.each([
    [{ message: 'Catálogo indisponível.' }, 'Catálogo indisponível.'],
    [null, 'Não foi possível carregar os exercícios.'],
  ])('shows query errors and navigates only after acknowledgement (%j)', (body, message) => {
    flushCatalogs();
    http
      .expectOne(`${baseUrl}/exercises?page=0&size=20`)
      .flush(body, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
    expect(openDialog).toHaveBeenCalledExactlyOnceWith({
      title: 'Não foi possível carregar os exercícios',
      message,
      primaryAction: 'Ok',
    });
    expect(navigate).not.toHaveBeenCalled();
    closed.next(true);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/']);
  });

  it('cancels pending list and auxiliary requests when the catalog is destroyed', () => {
    const requests = http.match((req) => req.url.startsWith(baseUrl));
    expect(requests).toHaveLength(5);
    fixture.destroy();
    expect(requests.every((req) => req.cancelled)).toBe(true);
  });
});
