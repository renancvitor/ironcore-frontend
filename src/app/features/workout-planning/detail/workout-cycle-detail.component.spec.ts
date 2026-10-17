import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { WorkoutPlanningService } from '../workout-planning.service';
import { GetWorkoutCycleDetailResponse } from '../workout-planning.models';
import { cycleDetail } from '../workout-planning.testing';
import { WorkoutCycleDetailComponent } from './workout-cycle-detail.component';

describe('WorkoutCycleDetailComponent', () => {
  let fixture: ComponentFixture<WorkoutCycleDetailComponent>;
  const service = { getWorkoutCycleDetail: vi.fn() };
  let routeId: string;

  beforeEach(async () => {
    routeId = '9';
    service.getWorkoutCycleDetail.mockReset().mockReturnValue(of(cycleDetail));
    await TestBed.configureTestingModule({
      imports: [WorkoutCycleDetailComponent],
      providers: [
        provideRouter([]),
        { provide: WorkoutPlanningService, useValue: service },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get paramMap() {
                return convertToParamMap({ id: routeId });
              },
            },
          },
        },
      ],
    }).compileComponents();
  });

  async function create(): Promise<void> {
    fixture = TestBed.createComponent(WorkoutCycleDetailComponent);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('shows loading and ignores duplicate retry requests', async () => {
    const request = new Subject<GetWorkoutCycleDetailResponse>();
    service.getWorkoutCycleDetail.mockReturnValue(request);
    await create();
    expect(fixture.nativeElement.querySelector('app-loading')).not.toBeNull();
    fixture.componentInstance.loadCycle();
    expect(service.getWorkoutCycleDetail).toHaveBeenCalledExactlyOnceWith(9);
    request.next(cycleDetail);
    request.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
  });

  it('renders the full projection with server day, activity and muscle order', async () => {
    await create();
    const text = fixture.nativeElement.textContent;
    for (const value of [
      'Força A',
      'Em andamento',
      'Objetivo do backend',
      '3 mês(es)',
      '01/10/2026',
      '31/12/2026',
      'Notas do ciclo',
      'Segunda linha',
      'Sexta-feira',
      'Segunda-feira',
      'Peitoral',
      'Tríceps',
      '22.5 kg',
      'Carga confortável',
      '15 min',
      '2.5 km',
      'Moderada',
      '90 s',
      'Execução controlada',
      'Séries',
      'Repetições mínimas',
      'Repetições máximas',
    ]) {
      expect(text).toContain(value);
    }
    const titles = (selector: string) =>
      Array.from(fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>).map(
        (el) => el.textContent!.trim(),
      );
    expect(titles('.ic-workout-detail__days h3')).toEqual(['Treino B', 'Treino A']);
    expect(titles('h4')).toEqual(['Exercício B', 'Exercício A']);
    expect(titles('.ic-workout-detail__muscles li')).toEqual(['Peitoral', 'Tríceps']);
    expect(text).toContain('Nenhuma atividade neste dia de treino.');
    expect(text).not.toContain('Origem');
  });

  it('renders a cycle without days', async () => {
    service.getWorkoutCycleDetail.mockReturnValue(of({ ...cycleDetail, days: [] }));
    await create();
    expect(fixture.nativeElement.textContent).toContain('Nenhum dia de treino neste ciclo.');
    expect(fixture.nativeElement.textContent).toContain('Força A');
  });

  it('renders nullable general fields and hides absent prescriptions and notes', async () => {
    service.getWorkoutCycleDetail.mockReturnValue(
      of({
        ...cycleDetail,
        notes: null,
        startDate: null,
        endDate: null,
        desiredDurationMonths: null,
        days: [{ ...cycleDetail.days[0], activities: [cycleDetail.days[0].activities[1]] }],
      }),
    );
    await create();
    expect(
      fixture.nativeElement.querySelector('.ic-workout-detail__fields').textContent.match(/—/g),
    ).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('.ic-workout-detail__notes')).toBeNull();
    expect(fixture.nativeElement.querySelector('.ic-workout-detail__muscles')).toBeNull();
    expect(
      fixture.nativeElement.querySelectorAll('.ic-workout-detail__prescription > div'),
    ).toHaveLength(0);
    expect(fixture.nativeElement.textContent).not.toMatch(/null|undefined/);
  });

  it('renders a partial prescription including zero values', async () => {
    service.getWorkoutCycleDetail.mockReturnValue(
      of({
        ...cycleDetail,
        days: [
          {
            ...cycleDetail.days[0],
            activities: [
              {
                ...cycleDetail.days[0].activities[1],
                repRangeMin: 5,
                restSeconds: 0,
                targetLoadKg: 0,
              },
            ],
          },
        ],
      }),
    );
    await create();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Repetições mínimas');
    expect(text).toContain('0 kg');
    expect(text).toContain('0 s');
    expect(text).not.toContain('Repetições máximas');
  });

  it.each([{}, { error: { message: 'Ciclo não encontrado.' } }])(
    'shows error and recovers with retry: %j',
    async (error) => {
      service.getWorkoutCycleDetail.mockReturnValueOnce(throwError(() => error));
      await create();
      expect(fixture.componentInstance.loading()).toBe(false);
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
        error.error?.message ?? 'Não foi possível carregar o ciclo de treino.',
      );
      fixture.nativeElement.querySelector('[role="alert"] button').click();
      fixture.detectChanges();
      expect(service.getWorkoutCycleDetail).toHaveBeenCalledTimes(2);
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Força A');
    },
  );

  it('returns to the catalog from the accessible header button, including on error', async () => {
    service.getWorkoutCycleDetail.mockReturnValueOnce(throwError(() => new Error('offline')));
    await create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.nativeElement.querySelector('button[aria-label="Voltar aos ciclos de treino"]').click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/workout-planning']);
  });

  it.each(['0', '-1', 'abc', '1.5', '9007199254740992'])(
    'redirects invalid cycle ID %s without a request',
    async (id) => {
      routeId = id;
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      await create();
      expect(service.getWorkoutCycleDetail).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/workout-planning']);
    },
  );
});
