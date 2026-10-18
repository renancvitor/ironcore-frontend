import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeComponent } from './home.component';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: '' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/users/me/body-metrics/latest')
      .flush(null, { status: 404, statusText: 'Not Found' });
    TestBed.inject(HttpTestingController)
      .expectOne((request) => request.url === '/api/users/me/body-metrics/progress/changes')
      .flush({ startDate: '2026-05-01', endDate: '2026-10-11', changes: [] });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-body-metrics-latest-card')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma avaliação corporal cadastrada.');
    flushEmptyWorkoutSummary();
  });

  function flushEmptyWorkoutSummary(): void {
    const http = TestBed.inject(HttpTestingController);
    for (const status of ['IN_PROGRESS', 'NOT_STARTED']) {
      http
        .expectOne(
          (request) =>
            request.url === '/api/users/me/workout-cycles' &&
            request.params.get('workoutStatus') === status,
        )
        .flush({
          cycles: { content: [], page: 0, size: 3, totalElements: 0, totalPages: 0, last: true },
        });
    }
    fixture.detectChanges();
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('renders the three summary cards and links to the full progress page', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(
      Array.from(element.querySelectorAll('.ic-summary-card__header h2'), (title) =>
        title.textContent?.trim(),
      ),
    ).toEqual(['Última avaliação corporal', 'Planejamento de treinos', 'Evolução corporal']);
    const card = element.querySelector('app-in-progress-workouts-card')!;
    expect(card.querySelector('app-summary-card')).toBeTruthy();
    expect(card.querySelector('app-loading')).toBeTruthy();
    expect(card.querySelector('footer a')?.getAttribute('href')).toBe('/workout-planning');
    const progress = element.querySelector('app-body-metrics-progress-card')!;
    expect(progress.textContent).toContain('Sem dados suficientes para este resumo no período.');
    expect(progress.querySelector('footer a')?.getAttribute('href')).toBe(
      '/body-metrics/progress?from=home',
    );
    flushEmptyWorkoutSummary();
    expect(card.querySelector('app-empty-state')).toBeTruthy();
    expect(progress.textContent).toContain('Sem dados suficientes');
  });

  it('isolates workout errors and retry from both Body Metrics cards', () => {
    const http = TestBed.inject(HttpTestingController);
    const endpoint = '/api/users/me/workout-cycles';
    http
      .expectOne((request) => request.url === endpoint)
      .flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-body-metrics-latest-card')?.textContent).toContain(
      'Nenhuma avaliação corporal cadastrada.',
    );
    expect(element.querySelector('app-body-metrics-progress-card')?.textContent).toContain(
      'Sem dados suficientes',
    );
    expect(element.querySelectorAll('.ic-summary-card')).toHaveLength(3);
    element.querySelector<HTMLButtonElement>('app-in-progress-workouts-card button')!.click();
    fixture.detectChanges();
    http.expectNone((request) => request.url.includes('body-metrics'));
    http
      .expectOne((request) => request.url === endpoint)
      .flush({
        cycles: {
          content: [
            {
              id: 9,
              name: 'Força',
              workoutStatus: 'IN_PROGRESS',
              trainingGoal: { id: 1, name: 'Força' },
              startDate: '2026-10-01',
              desiredDurationMonths: null,
            },
          ],
        },
      });
    fixture.detectChanges();
    expect(element.querySelector('app-in-progress-workouts-card')?.textContent).toContain('Força');
    expect(element.querySelector('app-in-progress-workouts-card li a')?.getAttribute('href')).toBe(
      '/workout-planning/9?from=home',
    );
    expect(
      element.querySelector('app-in-progress-workouts-card footer a')?.getAttribute('href'),
    ).toBe('/workout-planning');
    expect(element.querySelectorAll('.ic-summary-card')).toHaveLength(3);
  });
});
