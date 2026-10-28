import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { ExerciseCatalogComponent } from '../../exercise/catalog/exercise-catalog.component';
import { ExerciseCatalogStateService } from '../../exercise/catalog/exercise-catalog-state.service';
import { WorkoutSessionProgressComponent } from './workout-session-progress.component';
import { ANALYTICS_INDICATORS } from './workout-session-progress.utils';
import {
  cardioPoint,
  cardioResponse,
  strengthPoint,
  strengthResponse,
} from './workout-session-progress.testing';

describe('Workout Session progress with HTTP', () => {
  const base = '/api/users/me/workout-sessions/analytics/exercises/';
  const selection =
    'exerciseId=50&startDate=2025-01-01&endDate=2025-02-01&family=strength&metric=maxNormalizedLoadKg';
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let component: WorkoutSessionProgressComponent;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'workout-sessions/progress', component: WorkoutSessionProgressComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => http.verify());

  async function open(query = selection) {
    component = await harness.navigateByUrl(
      '/workout-sessions/progress' + (query ? '?' + query : ''),
      WorkoutSessionProgressComponent,
    );
    return component;
  }
  function request(family: string, exerciseId = 50) {
    return http.expectOne((req) => req.url === `${base}${exerciseId}/${family}`);
  }
  async function settle() {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }
  const text = () => harness.routeNativeElement!.textContent!;

  it('asks for a selection without loading the catalog or analytics prematurely', async () => {
    await open('');
    expect(text()).toContain('Selecione um exercício');
    expect(component.period().startDate.slice(8)).toBe('01');
    http.expectNone(() => true);
  });

  it('loads both families with exact dates and changes loaded indicators without HTTP', async () => {
    await open();
    expect(harness.routeNativeElement!.querySelector('app-loading')).not.toBeNull();
    const strength = request('strength');
    expect(strength.request.params.toString()).toBe('startDate=2025-01-01&endDate=2025-02-01');
    strength.flush(strengthResponse());
    request('cardio').flush(cardioResponse());
    await settle();
    expect(text()).toContain('Exercício histórico');
    component.selectIndicator(ANALYTICS_INDICATORS[1]);
    await settle();
    expect(text()).toContain('120,6 kg·rep');
    component.selectFamily('cardio');
    await settle();
    component.selectIndicator(ANALYTICS_INDICATORS[4]);
    await settle();
    expect(router.url).toContain('metric=averagePaceMinPerKm');
    expect(text()).toContain('6 min/km');
    http.expectNone(() => true);
  });

  it('displays summary averages and coverage received from the backend without deriving them from totals', async () => {
    await open(
      selection.replace(
        'family=strength&metric=maxNormalizedLoadKg',
        'family=cardio&metric=distanceKm',
      ),
    );
    request('strength').flush(strengthResponse());
    request('cardio').flush(cardioResponse());
    await settle();
    const summary = harness.routeNativeElement!.querySelector(
      '.ic-session-progress__summary',
    )!.textContent!;
    expect(summary).toContain('6 km');
    expect(summary).toContain('60 min');
    expect(summary).toContain('≈ 6:40 min/km');
    expect(summary).toContain('6,67 min/km');
    expect(summary).toContain('9 km/h');
    expect(summary).toContain('3 registro(s) de duração');
    expect(summary).toContain('2 registro(s) elegível(is)');
  });

  it('keeps the requested family when discovering its first available indicator', async () => {
    await open('exerciseId=50&startDate=2025-01-01&endDate=2025-02-01&family=cardio');
    request('strength').flush(strengthResponse());
    request('cardio').flush(cardioResponse());
    await settle();
    expect(component.family()).toBe('cardio');
    expect(component.indicator().key).toBe('distanceKm');
    component.confirmExercise([
      {
        id: 50,
        name: 'Mesmo exercício',
        activityType: { id: 1, code: 'GENERIC', name: 'Atividade' },
        equipmentType: { id: 1, code: 'NONE', name: 'Sem equipamento' },
        unilateral: false,
        compound: false,
        suggestedRestSeconds: null,
      },
    ]);
    await settle();
    expect(component.indicator().key).toBe('distanceKm');
    expect(router.url).toContain('metric=distanceKm');
    http.expectNone(() => true);
  });

  it.each([
    ['2024-02-29', '2025-02-28', '12 meses'],
    ['2999-01-01', '2999-02-01', 'futuras'],
    ['2025-02-01', '2025-01-01', 'maior'],
  ])(
    'rejects invalid applied periods %s to %s without replacing the results',
    async (startDate, endDate, message) => {
      await open();
      request('strength').flush(strengthResponse());
      request('cardio').flush(cardioResponse());
      await settle();
      component.form.setValue({ startDate, endDate });
      component.applyPeriod();
      expect(component.validationError()).toContain(message);
      expect(component.period()).toEqual({ startDate: '2025-01-01', endDate: '2025-02-01' });
      expect(component.strength()?.points).toHaveLength(1);
      http.expectNone(() => true);
    },
  );

  it('discovers available metrics from non-null values, including zero, independently of classifications', async () => {
    await open('exerciseId=50&startDate=2025-01-01&endDate=2025-02-01');
    request('strength').flush(
      strengthResponse([strengthPoint({ maxNormalizedLoadKg: null, volumeKgReps: null })]),
    );
    request('cardio').flush(
      cardioResponse([
        cardioPoint({
          distanceKm: 0,
          durationMinutes: null,
          averagePaceMinPerKm: null,
          averageSpeedKmPerHour: null,
        }),
      ]),
    );
    await settle();
    expect(component.family()).toBe('cardio');
    expect(component.indicator().key).toBe('distanceKm');
    expect(component.isAvailable(ANALYTICS_INDICATORS[2])).toBe(true);
    expect(component.isAvailable(ANALYTICS_INDICATORS[4])).toBe(false);
    const pace = harness.routeNativeElement!.querySelector<HTMLInputElement>(
      'input[value="averagePaceMinPerKm"]',
    )!;
    expect(pace.disabled).toBe(true);
    expect(text()).toContain('0 km');
    expect(router.url).toContain('metric=distanceKm');
  });

  it('distinguishes no sessions from sessions with no eligible load/repetition metrics', async () => {
    await open();
    request('strength').flush(strengthResponse([]));
    request('cardio').flush(cardioResponse([]));
    await settle();
    expect(text()).toContain('Nenhuma sessão encerrada');
    expect(harness.routeNativeElement!.querySelector('table')).toBeNull();
    component.form.setValue({ startDate: '2025-01-02', endDate: '2025-02-01' });
    component.applyPeriod();
    await settle();
    request('strength').flush(
      strengthResponse([
        strengthPoint({ maxNormalizedLoadKg: null, volumeKgReps: null, volumeSetCount: 0 }),
      ]),
    );
    request('cardio').flush(cardioResponse([]));
    await settle();
    expect(text()).toContain('Há sessões no período, mas sem informação elegível');
    expect(harness.routeNativeElement!.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(harness.routeNativeElement!.querySelector('.ic-chart__marker')).toBeNull();
  });

  it('applies only valid dates explicitly and keeps unapplied fields while changing indicators', async () => {
    await open();
    request('strength').flush(strengthResponse());
    request('cardio').flush(cardioResponse());
    component.form.setValue({ startDate: '', endDate: '2025-02-01' });
    component.applyPeriod();
    expect(component.validationError()).toContain('válidas');
    component.selectIndicator(ANALYTICS_INDICATORS[1]);
    await settle();
    expect(component.form.controls.startDate.value).toBe('');
    expect(component.period().startDate).toBe('2025-01-01');
    http.expectNone(() => true);
    component.form.setValue({ startDate: '2025-01-10', endDate: '2025-02-10' });
    component.applyPeriod();
    await settle();
    const next = request('strength');
    expect(next.request.params.get('startDate')).toBe('2025-01-10');
    next.flush(strengthResponse());
    request('cardio').flush(cardioResponse());
    await settle();
    expect(component.validationError()).toBe('');
    expect(router.url).toContain('startDate=2025-01-10');
  });

  it.each([
    'exerciseId=abc',
    'exerciseId=50&startDate=invalid&endDate=2025-02-01',
    'exerciseId=50&startDate=2025-01-01',
    'exerciseId=50&startDate=2999-01-01&endDate=2999-02-01',
  ])('does not query invalid URL input: %s', async (query) => {
    await open(query);
    expect(component.invalidExercise() || !!component.validationError()).toBe(true);
    http.expectNone(() => true);
  });

  it('cancels old exercise and period requests, keeps current loading and cleans up on destroy', async () => {
    await open();
    const oldStrength = request('strength'),
      oldCardio = request('cardio');
    await harness.navigateByUrl(
      '/workout-sessions/progress?' + selection.replace('exerciseId=50', 'exerciseId=51'),
    );
    expect(oldStrength.cancelled).toBe(true);
    expect(oldCardio.cancelled).toBe(true);
    const nextStrength = request('strength', 51),
      nextCardio = request('cardio', 51);
    component.form.setValue({ startDate: '2025-01-02', endDate: '2025-02-01' });
    component.applyPeriod();
    await settle();
    expect(nextStrength.cancelled).toBe(true);
    expect(nextCardio.cancelled).toBe(true);
    expect(component.strengthLoading()).toBe(true);
    expect(component.cardioLoading()).toBe(true);
    const finalStrength = request('strength', 51),
      finalCardio = request('cardio', 51);
    harness.fixture.destroy();
    expect(finalStrength.cancelled).toBe(true);
    expect(finalCardio.cancelled).toBe(true);
  });

  it.each(['strength', 'cardio'] as const)(
    'isolates a %s failure and retries only that family',
    async (family) => {
      await open();
      const strength = request('strength'),
        cardio = request('cardio');
      if (family === 'strength') {
        strength.flush({ message: 'Falha independente' }, { status: 500, statusText: 'Error' });
        cardio.flush(cardioResponse());
      } else {
        strength.flush(strengthResponse());
        cardio.flush({ message: 'Falha independente' }, { status: 500, statusText: 'Error' });
      }
      await settle();
      expect(text()).toContain('Falha independente');
      const otherResponse = family === 'strength' ? component.cardio() : component.strength();
      expect(otherResponse).not.toBeNull();
      component.retry(family);
      const retry = request(family);
      http.expectNone((req) => req.url.endsWith(family === 'strength' ? '/cardio' : '/strength'));
      retry.flush(family === 'strength' ? strengthResponse() : cardioResponse());
      await settle();
      expect(component.strengthError()).toBe('');
      expect(component.cardioError()).toBe('');
      expect(family === 'strength' ? component.cardio() : component.strength()).toBe(otherResponse);
    },
  );

  it('reuses the active catalog with isolated state, search, pagination and single selection', async () => {
    TestBed.inject(ExerciseCatalogStateService).page = 5;
    await open('');
    component.choosingExercise.set(true);
    harness.detectChanges();
    const catalog = harness.fixture.debugElement.query(By.directive(ExerciseCatalogComponent))
      .componentInstance as ExerciseCatalogComponent;
    expect(catalog.mode()).toBe('select');
    expect(catalog.multiple()).toBe(false);
    const exercise = {
      id: 50,
      name: 'Selecionado no catálogo',
      activityType: { id: 1, code: 'GENERIC', name: 'Atividade' },
      equipmentType: { id: 1, code: 'NONE', name: 'Sem equipamento' },
      unilateral: false,
      compound: false,
      suggestedRestSeconds: null,
    };
    const page = (index: number) => ({
      exercises: {
        content: [exercise],
        page: index,
        size: 20,
        totalElements: 30,
        totalPages: 2,
        last: index === 1,
      },
    });
    const initial = http.expectOne((req) => req.url.endsWith('/exercise-catalog/exercises'));
    expect(initial.request.params.get('page')).toBe('0');
    initial.flush(page(0));
    for (const type of ['activity-types', 'equipment-types', 'muscle-groups', 'muscle-subgroups']) {
      http.expectOne('/api/exercise-catalog/' + type).flush([]);
    }
    catalog.filtersForm.controls.name.setValue('Selecionado');
    catalog.applyFilters();
    const search = http.expectOne((req) => req.url.endsWith('/exercise-catalog/exercises'));
    expect(search.request.params.get('name')).toBe('Selecionado');
    search.flush(page(0));
    catalog.onPageChange({ pageIndex: 1, pageSize: 20, length: 30 });
    const next = http.expectOne((req) => req.url.endsWith('/exercise-catalog/exercises'));
    expect(next.request.params.get('page')).toBe('1');
    next.flush(page(1));
    catalog.toggleExercise(exercise);
    catalog.confirmSelection();
    await settle();
    expect(component.exerciseId()).toBe(50);
    request('strength').flush(strengthResponse());
    request('cardio').flush(cardioResponse());
    await settle();
    expect(TestBed.inject(ExerciseCatalogStateService).page).toBe(5);
    http.expectNone('/api/exercise-catalog/exercises/50');
  });
});
