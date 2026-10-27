import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { By } from '@angular/platform-browser';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { cycleDetail } from '../../workout-planning/workout-planning.testing';
import { sessionHistory, sessionHistoryItem } from '../workout-sessions.testing';
import { WorkoutSessionHistoryComponent } from './workout-session-history.component';

describe('WorkoutSessionHistoryComponent with HTTP', () => {
  let fixture: ComponentFixture<WorkoutSessionHistoryComponent>;
  let component: WorkoutSessionHistoryComponent;
  let http: HttpTestingController;
  const url = '/api/users/me/workout-sessions';
  const cyclesUrl = '/api/users/me/workout-cycles';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutSessionHistoryComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(WorkoutSessionHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  function request() {
    return http.expectOne((req) => req.url === url);
  }
  function load() {
    request().flush(sessionHistory());
    fixture.detectChanges();
  }
  function button(label: string): HTMLButtonElement {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((element) => element.textContent?.trim() === label)!;
  }

  it('loads only the first server page, renders snapshots without origins, and opens detail', () => {
    component.load();
    component.load();
    expect(fixture.nativeElement.querySelector('app-loading')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('section').getAttribute('aria-busy')).toBe('true');
    const first = request();
    expect(first.request.params.get('page')).toBe('0');
    expect(first.request.params.get('size')).toBe('20');
    first.flush(sessionHistory());
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    for (const value of [
      'Treino preservado',
      'Ciclo preservado',
      'Terça-feira',
      '27/10/2026',
      '10:00',
      '11:00',
      'Encerramento manual',
    ])
      expect(text).toContain(value);
    expect(text).not.toMatch(/undefined|null/);
    expect(fixture.nativeElement.querySelectorAll('article')).toHaveLength(1);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    button('Consultar sessão').click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/workout-sessions', 100], {
      queryParams: { from: 'history' },
    });
    http.expectNone((req) => req.url.startsWith(cyclesUrl));
  });

  it('uses server paginator metadata and returns to page zero when size changes', () => {
    request().flush(sessionHistory([sessionHistoryItem], 0, 20, 65));
    fixture.detectChanges();
    const paginator = fixture.debugElement.query(By.directive(MatPaginator))
      .componentInstance as MatPaginator;
    expect(paginator.length).toBe(65);
    paginator.page.emit({ pageIndex: 2, pageSize: 20, length: 65 });
    const second = request();
    expect(second.request.params.get('page')).toBe('2');
    second.flush(sessionHistory([sessionHistoryItem], 2, 20, 65));
    component.onPageChange({ pageIndex: 1, pageSize: 50, length: 65 });
    const resized = request();
    expect(resized.request.params.get('page')).toBe('0');
    expect(resized.request.params.get('size')).toBe('50');
    resized.flush(sessionHistory([sessionHistoryItem], 0, 50, 65));
    fixture.detectChanges();
    expect(paginator.pageSize).toBe(50);
  });

  it('applies combined filters at page zero and clears them through the UI', () => {
    load();
    component.state.page = 3;
    component.filtersForm.patchValue({
      workoutCycleId: 9,
      workoutDayId: 30,
      startDate: '2026-10-01',
      endDate: '2026-10-27',
    });
    http.expectOne(`${cyclesUrl}/9`).flush(cycleDetail);
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    const filtered = request();
    expect(filtered.request.params.keys().sort()).toEqual([
      'endDate',
      'page',
      'size',
      'startDate',
      'workoutCycleId',
      'workoutDayId',
    ]);
    expect(filtered.request.params.get('page')).toBe('0');
    expect(filtered.request.params.get('workoutDayId')).toBe('30');
    expect(filtered.request.params.get('startDate')).toBe('2026-10-01');
    filtered.flush(sessionHistory());
    fixture.detectChanges();
    button('Limpar filtros').click();
    const cleared = request();
    expect(cleared.request.params.keys().sort()).toEqual(['page', 'size']);
    cleared.flush(sessionHistory());
    expect(component.filtersForm.getRawValue()).toEqual({
      workoutCycleId: null,
      workoutDayId: null,
      startDate: '',
      endDate: '',
    });
  });

  it.each(['startDate', 'endDate'] as const)('accepts a single %s as a local ISO date', (field) => {
    load();
    component.filtersForm.controls[field].setValue('2026-01-01');
    component.applyFilters();
    const filtered = request();
    expect(filtered.request.params.get(field)).toBe('2026-01-01');
    expect(filtered.request.params.keys()).toHaveLength(3);
    filtered.flush(sessionHistory());
  });

  it('validates inverted ranges and impossible dates before HTTP', () => {
    load();
    component.filtersForm.patchValue({ startDate: '2026-10-28', endDate: '2026-10-27' });
    component.applyFilters();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'data inicial deve ser anterior',
    );
    for (const date of ['2026-02-30', '2025-02-29', '2026-13-01', '27/10/2026']) {
      component.filtersForm.patchValue({ startDate: date, endDate: '' });
      component.applyFilters();
      expect(component.filtersForm.controls.startDate.invalid).toBe(true);
    }
    http.expectNone((req) => req.url === url);
    component.filtersForm.patchValue({ startDate: '2024-02-29' });
    component.applyFilters();
    request().flush(sessionHistory());
  });

  it.each([0, -1, 1.5, Number.NaN, 9007199254740992])('rejects invalid origin ID %s', (id) => {
    load();
    component.filtersForm.controls.workoutDayId.setValue(id);
    component.applyFilters();
    expect(component.filtersForm.invalid).toBe(true);
    http.expectNone((req) => req.url === url);
  });

  it('supports a day filter independently without loading planning', () => {
    load();
    component.filtersForm.controls.workoutDayId.setValue(30);
    component.applyFilters();
    const filtered = request();
    expect(filtered.request.params.get('workoutDayId')).toBe('30');
    expect(filtered.request.params.has('workoutCycleId')).toBe(false);
    filtered.flush(sessionHistory());
    http.expectNone((req) => req.url.startsWith(cyclesUrl));
  });

  it('rejects an invalid cycle before both history and planning requests', () => {
    load();
    component.filtersForm.controls.workoutCycleId.setValue(-1);
    component.applyFilters();
    expect(component.filtersForm.invalid).toBe(true);
    http.expectNone(() => true);
  });

  it('searches cycle names from the keyboard without submitting history filters', () => {
    load();
    component.cycleSearch.setValue('Força');
    const input = fixture.nativeElement.querySelector('#history-cycle-search') as HTMLInputElement;
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    const search = http.expectOne((req) => req.url === cyclesUrl);
    expect(search.request.params.get('name')).toBe('Força');
    search.flush({
      cycles: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true },
    });
    http.expectNone((req) => req.url === url);
  });

  it('cancels stale filter reads and cleans up the active subscription on destroy', () => {
    const old = request();
    component.filtersForm.controls.startDate.setValue('2026-10-01');
    component.applyFilters();
    expect(old.cancelled).toBe(true);
    const newer = request();
    component.clearFilters();
    expect(newer.cancelled).toBe(true);
    const pending = request();
    expect(component.loading()).toBe(true);
    fixture.destroy();
    expect(pending.cancelled).toBe(true);
  });

  it('distinguishes an empty history, no filter results, and an empty later page', () => {
    request().flush(sessionHistory([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('ainda não tem sessões encerradas');
    component.filtersForm.controls.startDate.setValue('2026-10-01');
    component.applyFilters();
    request().flush(sessionHistory([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Nenhuma sessão encontrada para os filtros',
    );
    component.onPageChange({ pageIndex: 2, pageSize: 20, length: 30 });
    request().flush(sessionHistory([], 2, 20, 30));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma sessão nesta página');
    const paginator = fixture.debugElement.query(By.directive(MatPaginator))
      .componentInstance as MatPaginator;
    expect(paginator.hasPreviousPage()).toBe(true);
  });

  it('renders HTTP errors and retries only GET while keeping applied filters', () => {
    request().flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Não foi possível carregar',
    );
    button('Tentar novamente').click();
    request().flush(sessionHistory());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    component.onPageChange({ pageIndex: 1, pageSize: 20, length: 30 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('article')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-loading')).not.toBeNull();
    request().flush(sessionHistory([], 1, 20, 30));
  });

  it('restores applied filters and pagination when the component is recreated', () => {
    load();
    component.filtersForm.controls.startDate.setValue('2026-10-01');
    component.applyFilters();
    request().flush(sessionHistory());
    component.onPageChange({ pageIndex: 2, pageSize: 20, length: 60 });
    request().flush(sessionHistory([sessionHistoryItem], 2, 20, 60));
    fixture.destroy();
    fixture = TestBed.createComponent(WorkoutSessionHistoryComponent);
    component = fixture.componentInstance;
    const restored = request();
    expect(restored.request.params.get('page')).toBe('2');
    expect(restored.request.params.get('startDate')).toBe('2026-10-01');
    restored.flush(sessionHistory([sessionHistoryItem], 2, 20, 60));
    expect(component.filtersForm.controls.startDate.value).toBe('2026-10-01');
    expect(component.filtersForm.controls.workoutDayId.value).toBeNull();
    expect(component.filtersForm.controls.workoutCycleId.value).toBeNull();
    expect(component.filtersForm.valid).toBe(true);
    component.applyFilters();
    const reapplied = request();
    expect(reapplied.request.params.get('startDate')).toBe('2026-10-01');
    expect(reapplied.request.params.get('page')).toBe('0');
    reapplied.flush(sessionHistory());
  });

  it('searches planning by name in explicit pages and cancels superseded searches', () => {
    load();
    component.cycleSearch.setValue('Força');
    component.searchCycles();
    const old = http.expectOne((req) => req.url === cyclesUrl);
    expect(old.request.params.get('name')).toBe('Força');
    component.cycleSearch.setValue('Base');
    component.searchCycles();
    expect(old.cancelled).toBe(true);
    const first = http.expectOne((req) => req.url === cyclesUrl);
    const item = {
      id: 9,
      name: 'Base',
      workoutStatus: 'COMPLETED',
      trainingGoal: { id: 1, name: 'Força' },
      startDate: null,
      endDate: null,
      desiredDurationMonths: null,
    };
    first.flush({
      cycles: { content: [item], page: 0, size: 20, totalElements: 21, totalPages: 2, last: false },
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1 de 21 ciclos encontrados');
    button('Carregar mais ciclos').click();
    const more = http.expectOne((req) => req.url === cyclesUrl);
    expect(more.request.params.get('page')).toBe('1');
    expect(more.request.params.get('name')).toBe('Base');
    more.flush({
      cycles: {
        content: [{ ...item, id: 10 }],
        page: 1,
        size: 20,
        totalElements: 21,
        totalPages: 2,
        last: true,
      },
    });
    expect(component.cycles()).toHaveLength(2);
  });

  it('restores a selected cycle name and day without replaying the whole planning search', async () => {
    load();
    component.searchCycles();
    http
      .expectOne((req) => req.url === cyclesUrl)
      .flush({
        cycles: {
          content: [cycleDetail],
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
          last: true,
        },
      });
    component.filtersForm.controls.workoutCycleId.setValue(9);
    http.expectOne(`${cyclesUrl}/9`).flush(cycleDetail);
    component.filtersForm.controls.workoutDayId.setValue(30);
    component.applyFilters();
    request().flush(sessionHistory());
    fixture.destroy();
    fixture = TestBed.createComponent(WorkoutSessionHistoryComponent);
    component = fixture.componentInstance;
    const restored = request();
    expect(restored.request.params.get('workoutCycleId')).toBe('9');
    expect(restored.request.params.get('workoutDayId')).toBe('30');
    restored.flush(sessionHistory());
    http.expectOne(`${cyclesUrl}/9`).flush(cycleDetail);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.cycleOptions()).toEqual([{ id: 9, name: 'Força A' }]);
    expect(fixture.nativeElement.querySelector('#history-cycle').textContent).toContain('Força A');
    expect(fixture.nativeElement.querySelector('#history-day').textContent).toContain('Treino B');
    expect(component.filtersForm.valid).toBe(true);
    http.expectNone((req) => req.url === cyclesUrl);
  });

  it('resets incompatible day filters, cancels previous cycle details, and supports planning recovery', () => {
    load();
    component.filtersForm.controls.workoutDayId.setValue(30);
    component.filtersForm.controls.workoutCycleId.setValue(9);
    expect(component.filtersForm.controls.workoutDayId.value).toBeNull();
    const old = http.expectOne(`${cyclesUrl}/9`);
    component.filtersForm.controls.workoutCycleId.setValue(10);
    expect(old.cancelled).toBe(true);
    http.expectOne(`${cyclesUrl}/10`).flush({}, { status: 404, statusText: 'Not found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível consultar os treinos');
    button('Consultar treinos novamente').click();
    http.expectOne(`${cyclesUrl}/10`).flush({ ...cycleDetail, id: 10 });
    expect(component.days()).toEqual(cycleDetail.days);
    component.searchCycles();
    http.expectOne((req) => req.url === cyclesUrl).error(new ProgressEvent('error'));
    expect(component.cyclesError()).toContain('Não foi possível buscar ciclos');
    component.searchCycles();
    http
      .expectOne((req) => req.url === cyclesUrl)
      .flush({
        cycles: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true },
      });
    expect(component.cyclesError()).toBe('');
  });

  it('uses labelled unique controls and semantic cards with native keyboard actions', () => {
    load();
    const root: HTMLElement = fixture.nativeElement;
    const ids = Array.from(root.querySelectorAll('[id]')).map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const control of Array.from(root.querySelectorAll('input'))) {
      expect(control.id).toBeTruthy();
      expect(root.querySelector(`label[for="${control.id}"]`)).not.toBeNull();
    }
    expect(root.querySelector('article')?.getAttribute('aria-labelledby')).toBe(
      'history-session-100',
    );
    expect(root.querySelector('mat-paginator')?.getAttribute('aria-label')).toContain('histórico');
    expect(button('Consultar sessão').type).toBe('button');
  });
});
