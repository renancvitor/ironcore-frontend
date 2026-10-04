import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BodyMetricsLatestComponent } from './body-metrics-latest.component';
import { BodyMetricsService } from '../body-metrics.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('BodyMetricsLatestComponent', () => {
  let component: BodyMetricsLatestComponent;
  let fixture: ComponentFixture<BodyMetricsLatestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BodyMetricsLatestComponent],
      providers: [
        {
          provide: BodyMetricsService,
          useValue: {
            getLatest: () =>
              of({
                id: 42,
                measuredAt: '2026-09-30T08:30:00',
                weightKg: 82.4,
                heightCm: 178.5,
                bmi: 25.8,
                bodyFatPercentage: null,
                fatMassKg: null,
                leanMassKg: null,
                circumferences: null,
                notes: 'Avaliação completa',
                updatedAt: null,
              }),
          },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BodyMetricsLatestComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    const text = fixture.nativeElement.textContent as string;
    for (const value of [
      'Última avaliação corporal',
      'Altura',
      '178.5 cm',
      'Circunferências',
      'Avaliação completa',
    ]) {
      expect(text).toContain(value);
    }
    fixture.nativeElement.querySelector('button').click();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/']);
  });
});
