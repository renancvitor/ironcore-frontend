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
    TestBed.inject(HttpTestingController).verify();
  });

  it('renders the three summary cards and links to the full progress page', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(
      Array.from(element.querySelectorAll('.ic-summary-card__header h2'), (title) =>
        title.textContent?.trim(),
      ),
    ).toEqual(['Última avaliação corporal', 'Treinos em andamento', 'Evolução corporal']);
    for (const [selector, message] of [
      [
        'app-in-progress-workouts-card',
        'O resumo dos treinos em andamento ainda não está disponível.',
      ],
    ]) {
      const card = element.querySelector(selector)!;
      expect(card.querySelector('app-summary-card')).toBeTruthy();
      expect(card.querySelector('app-empty-state')?.textContent).toContain(message);
      expect(card.querySelector('a, button, app-loading')).toBeNull();
      expect(card.querySelector('footer')?.matches(':empty')).toBe(true);
    }
    const progress = element.querySelector('app-body-metrics-progress-card')!;
    expect(progress.textContent).toContain('Sem dados suficientes para este resumo no período.');
    expect(progress.querySelector('footer a')?.getAttribute('href')).toBe(
      '/body-metrics/progress?from=home',
    );
    TestBed.inject(HttpTestingController).verify();
  });
});
