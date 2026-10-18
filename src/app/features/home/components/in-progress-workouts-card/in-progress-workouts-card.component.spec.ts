import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../../../core/http/api-base-url.token';
import {
  ListWorkoutCyclesItemResponse,
  ListWorkoutCyclesResponse,
  WorkoutStatus,
} from '../../../workout-planning/workout-planning.models';
import { InProgressWorkoutsCardComponent } from './in-progress-workouts-card.component';

describe('InProgressWorkoutsCardComponent', () => {
  let fixture: ComponentFixture<InProgressWorkoutsCardComponent>;
  let http: HttpTestingController;
  const endpoint = '/api/users/me/workout-cycles';
  const cycle: ListWorkoutCyclesItemResponse = {
    id: 9,
    name: 'Força A',
    workoutStatus: 'IN_PROGRESS',
    trainingGoal: { id: 22, name: 'Força' },
    startDate: '2026-10-05',
    endDate: null,
    desiredDurationMonths: 3,
  };
  const response = (
    content: ListWorkoutCyclesItemResponse[] = [cycle],
    totalElements = content.length,
  ): ListWorkoutCyclesResponse => ({
    cycles: {
      content,
      page: 0,
      size: 3,
      totalElements,
      totalPages: Math.ceil(totalElements / 3),
      last: totalElements <= 3,
    },
  });
  const request = (status: WorkoutStatus = 'IN_PROGRESS') =>
    http.expectOne((req) => req.url === endpoint && req.params.get('workoutStatus') === status);
  const content = () => (fixture.nativeElement as HTMLElement).textContent!;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 17, 0, 30));
    await TestBed.configureTestingModule({
      imports: [InProgressWorkoutsCardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '' },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(InProgressWorkoutsCardComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('loads a minimal status-filtered page with accessible loading and prevents duplicate requests', () => {
    const pending = request();
    expect(pending.request.method).toBe('GET');
    expect(pending.request.params.keys().sort()).toEqual(['page', 'size', 'workoutStatus']);
    expect(pending.request.params.get('page')).toBe('0');
    expect(pending.request.params.get('size')).toBe('3');
    expect(fixture.nativeElement.querySelector('app-loading')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[aria-busy="true"][aria-live="polite"]'),
    ).toBeTruthy();
    fixture.componentInstance.loadCycles();
    http.expectNone((req) => req.url === endpoint);
    pending.flush(response());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-busy="false"]')).toBeTruthy();
  });

  it('prioritizes IN_PROGRESS without consulting unstarted plans or fetching details/goals', () => {
    request().flush(response());
    fixture.detectChanges();
    for (const value of [
      'Força A',
      'Força',
      'Em andamento',
      '3 meses',
      'Duração desejada',
      'Em andamento há 12 dias',
    ]) {
      expect(content()).toContain(value);
    }
    expect(fixture.nativeElement.querySelectorAll('ul > li')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('progress, [role="progressbar"]')).toBeNull();
    for (const value of ['%', 'sessões', 'aderência', 'Previsão', 'Próximo treino'])
      expect(content()).not.toContain(value);
    http.expectNone(() => true);
  });

  it('falls back only after an empty ongoing page and lists unstarted plans in backend order', () => {
    request().flush(response([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-loading')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
    const pending = request('NOT_STARTED');
    expect(pending.request.params.get('page')).toBe('0');
    expect(pending.request.params.get('size')).toBe('3');
    pending.flush(
      response([
        { ...cycle, id: 7, name: 'Ciclo A', workoutStatus: 'NOT_STARTED', startDate: null },
        { ...cycle, id: 8, name: 'Ciclo B', workoutStatus: 'NOT_STARTED', startDate: null },
      ]),
    );
    fixture.detectChanges();
    expect(content()).toContain('Ciclo A');
    expect(content()).toContain('Não iniciado');
    expect(content()).toContain('Ciclo B');
    expect(fixture.nativeElement.querySelectorAll('ul > li')).toHaveLength(2);
    expect(content()).not.toContain('Em andamento');
    expect(content()).not.toContain('Data de início');
    expect(fixture.nativeElement.querySelector('li a')?.getAttribute('href')).toBe(
      '/workout-planning/7?from=home',
    );
    http.expectNone(() => true);
  });

  it('shows a real empty state when neither status has cycles, including users with only finished cycles', () => {
    request().flush(response([]));
    request('NOT_STARTED').flush(response([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-empty-state')?.textContent).toContain(
      'Nenhum ciclo em andamento ou aguardando início.',
    );
    expect(fixture.nativeElement.querySelector('ul, app-loading, [role="alert"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('footer a')?.getAttribute('href')).toBe(
      '/workout-planning',
    );
    http.expectNone(() => true);
  });

  it.each(['IN_PROGRESS', 'NOT_STARTED'] as const)(
    'shows an error and retries the full priority lookup when %s fails',
    (status) => {
      if (status === 'NOT_STARTED') request().flush(response([]));
      request(status).flush(null, { status: 500, statusText: 'Error' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
        'Não foi possível carregar',
      );
      expect(fixture.nativeElement.querySelector('app-empty-state, app-loading, ul')).toBeNull();
      http.expectNone(() => true);
      fixture.nativeElement.querySelector('button').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-loading')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
      request().flush(response());
      fixture.detectChanges();
      expect(content()).toContain('Força A');
      expect(fixture.nativeElement.querySelector('app-loading, button')).toBeNull();
    },
  );

  it.each([
    ['2026-10-17', 'Iniciado hoje'],
    ['2026-10-16', 'Em andamento há 1 dia'],
    ['2026-09-30', 'Em andamento há 17 dias'],
  ])('derives calendar days from %s without timezone shifts', (startDate, insight) => {
    request().flush(response([{ ...cycle, startDate, desiredDurationMonths: 1 }]));
    fixture.detectChanges();
    expect(content()).toContain(insight);
    expect(content()).toContain('1 mês');
  });

  it.each([null, '2026-10-18'])(
    'does not invent elapsed days from absent or future dates (%s)',
    (startDate) => {
      request().flush(response([{ ...cycle, startDate, desiredDurationMonths: null }]));
      fixture.detectChanges();
      expect(content()).not.toContain('Em andamento há');
      expect(content()).not.toContain('Iniciado hoje');
      expect(content()).not.toContain('Duração desejada');
      expect(content()).not.toContain('NaN');
      expect(content()).toContain('Em andamento');
    },
  );

  it.each([true, false])('navigates via the footer link (has cycle: %s)', (hasCycle) => {
    request().flush(response(hasCycle ? [cycle] : []));
    if (!hasCycle) request('NOT_STARTED').flush(response([]));
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const link = fixture.nativeElement.querySelector('footer a') as HTMLAnchorElement;
    link.click();
    expect(navigate).toHaveBeenCalledOnce();
    const target = navigate.mock.calls[0][0];
    expect(TestBed.inject(Router).serializeUrl(target as import('@angular/router').UrlTree)).toBe(
      '/workout-planning',
    );
    expect(link.textContent).toContain('Ver todos');
  });

  it('shows multiple ongoing cycles equally, preserving API order and each individual insight', () => {
    request().flush(
      response([
        {
          ...cycle,
          id: 3,
          name: 'Corrida',
          trainingGoal: { id: 1, name: 'Resistência' },
          startDate: '2026-10-16',
        },
        {
          ...cycle,
          id: 1,
          name: 'Mobilidade',
          startDate: '2026-10-17',
          desiredDurationMonths: null,
        },
        { ...cycle, id: 2, name: 'Musculação' },
      ]),
    );
    fixture.detectChanges();
    const items = Array.from(fixture.nativeElement.querySelectorAll('ul > li')) as HTMLElement[];
    expect(items.map((item) => item.querySelector('h3')!.textContent!.trim())).toEqual([
      'Corrida',
      'Mobilidade',
      'Musculação',
    ]);
    expect(items.map((item) => item.querySelector('a')!.getAttribute('href'))).toEqual([
      '/workout-planning/3?from=home',
      '/workout-planning/1?from=home',
      '/workout-planning/2?from=home',
    ]);
    expect(items[0].textContent).toContain('Resistência');
    expect(items[0].textContent).toContain('Em andamento há 1 dia');
    expect(items[1].textContent).toContain('Iniciado hoje');
    expect(items[2].textContent).toContain('Em andamento há 12 dias');
    expect(content()).not.toContain('Exibindo');
    expect(fixture.nativeElement.querySelector('footer a')?.getAttribute('href')).toBe(
      '/workout-planning',
    );
    http.expectNone(() => true);
  });

  it.each(['IN_PROGRESS', 'NOT_STARTED'] as const)(
    'indicates additional %s cycles using API totals without loading more pages',
    (status) => {
      if (status === 'NOT_STARTED') request().flush(response([]));
      request(status).flush(
        response(
          [1, 2, 3].map((id) => ({
            ...cycle,
            id,
            name: `Ciclo ${id}`,
            workoutStatus: status,
            startDate: status === 'NOT_STARTED' ? null : cycle.startDate,
          })),
          8,
        ),
      );
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('ul > li')).toHaveLength(3);
      expect(content()).toContain('Exibindo 3 de 8 ciclos.');
      expect(fixture.nativeElement.querySelector('footer a')?.textContent).toContain('Ver todos');
      http.expectNone(() => true);
    },
  );

  it('opens any displayed cycle from its own link while retaining the Home origin', () => {
    request().flush(response([cycle, { ...cycle, id: 12, name: 'Musculação' }]));
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const links = fixture.nativeElement.querySelectorAll('li a') as NodeListOf<HTMLAnchorElement>;
    for (const [index, link] of Array.from(links).entries()) {
      link.click();
      expect(
        TestBed.inject(Router).serializeUrl(
          navigate.mock.calls[index][0] as import('@angular/router').UrlTree,
        ),
      ).toBe(`/workout-planning/${index === 0 ? 9 : 12}?from=home`);
    }
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it.each(['IN_PROGRESS', 'NOT_STARTED'] as const)(
    'cancels the pending %s request on destruction',
    (status) => {
      if (status === 'NOT_STARTED') request().flush(response([]));
      const pending = request(status);
      fixture.destroy();
      expect(pending.cancelled).toBe(true);
    },
  );
});
