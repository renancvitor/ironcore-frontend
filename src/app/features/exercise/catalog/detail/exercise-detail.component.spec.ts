import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { DialogService } from '../../../../shared/components/dialog/dialog.service';
import { GetExerciseByIdResponse, MuscleGroupItemResponse } from '../../exercise.models';
import { ExerciseService } from '../../exercise.service';
import { ExerciseDetailComponent } from './exercise-detail.component';

describe('ExerciseDetailComponent', () => {
  let fixture: ComponentFixture<ExerciseDetailComponent>;
  let request: Subject<GetExerciseByIdResponse>;
  let groups: Subject<MuscleGroupItemResponse[]>;
  let dialogClosed: Subject<boolean>;
  const route = { snapshot: { paramMap: convertToParamMap({ id: '10' }) } };
  const getById = vi.fn();
  const getGroups = vi.fn();
  const navigate = vi.fn();
  const openDialog = vi.fn();
  const response: GetExerciseByIdResponse = {
    id: 10,
    name: 'Supino reto',
    activityType: { id: 1, code: 'STRENGTH', name: 'Força' },
    equipmentType: { id: 2, code: 'BARBELL', name: 'Barra' },
    unilateral: false,
    compound: true,
    active: true,
    suggestedRestSeconds: 90,
    muscleTargets: [
      {
        muscleSubgroup: { id: 11, code: 'CHEST', name: 'Peitoral maior', muscleGroupId: 1 },
        targetRole: 'PRIMARY',
      },
      {
        muscleSubgroup: {
          id: 22,
          code: 'TRICEPS',
          name: 'Cabeça longa do tríceps',
          muscleGroupId: 2,
        },
        targetRole: 'SECONDARY',
      },
      {
        muscleSubgroup: { id: 33, code: 'CORE', name: 'Reto abdominal', muscleGroupId: 3 },
        targetRole: 'STABILIZER',
      },
    ],
  };

  beforeEach(async () => {
    request = new Subject();
    groups = new Subject();
    dialogClosed = new Subject();
    route.snapshot.paramMap = convertToParamMap({ id: '10' });
    getById.mockReset().mockReturnValue(request.asObservable());
    getGroups.mockReset().mockReturnValue(groups.asObservable());
    navigate.mockReset().mockResolvedValue(true);
    openDialog.mockReset().mockReturnValue(dialogClosed.asObservable());
    await TestBed.configureTestingModule({
      imports: [ExerciseDetailComponent],
      providers: [
        {
          provide: ExerciseService,
          useValue: { getExerciseById: getById, getMuscleGroups: getGroups },
        },
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: { navigate } },
        { provide: DialogService, useValue: { open: openDialog } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ExerciseDetailComponent);
  });

  function showExercise(value = response): void {
    fixture.detectChanges();
    request.next(value);
    request.complete();
    fixture.detectChanges();
  }

  it('loads the route ID and shows loading until the exercise arrives', () => {
    fixture.detectChanges();
    expect(getById).toHaveBeenCalledExactlyOnceWith(10);
    expect(getGroups).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('app-loading')).not.toBeNull();
    request.next(response);
    request.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Carregando grupos musculares',
    );
  });

  it.each([
    [true, false, true, 90, ['Ativo', 'Não', 'Sim', '90 s']],
    [false, true, false, null, ['Inativo', 'Sim', 'Não', '—']],
  ] as const)(
    'renders all general information (active=%s)',
    (active, unilateral, compound, rest, expected) => {
      showExercise({ ...response, active, unilateral, compound, suggestedRestSeconds: rest });
      const values = Array.from(
        fixture.nativeElement.querySelectorAll(
          '.ic-exercise-detail__value',
        ) as NodeListOf<HTMLElement>,
      ).map((el) => el.textContent!.trim());
      expect(values).toEqual([expected[0], 'Supino reto', 'Força', 'Barra', ...expected.slice(1)]);
    },
  );

  it('renders subgroup names, their backend groups and distinct role badges', () => {
    showExercise();
    groups.next([
      { id: 3, code: 'CORE', name: 'Abdômen' },
      { id: 1, code: 'CHEST', name: 'Peitoral' },
      { id: 2, code: 'TRICEPS', name: 'Tríceps' },
    ]);
    groups.complete();
    fixture.detectChanges();
    const targets = Array.from(
      fixture.nativeElement.querySelectorAll(
        '.ic-exercise-detail__target',
      ) as NodeListOf<HTMLElement>,
    );
    expect(targets).toHaveLength(3);
    for (const [index, name] of ['Peitoral', 'Tríceps', 'Abdômen'].entries()) {
      expect(
        targets[index].querySelector('.ic-exercise-detail__target-name')!.textContent!.trim(),
      ).toBe(response.muscleTargets[index].muscleSubgroup.name);
      expect(
        targets[index].querySelector('.ic-exercise-detail__target-group')!.textContent!.trim(),
      ).toBe(name);
    }
    const badges = targets.map((el) => el.querySelector('.ic-exercise-detail__target-role')!);
    expect(badges.map((el) => el.getAttribute('data-role'))).toEqual([
      'PRIMARY',
      'SECONDARY',
      'STABILIZER',
    ]);
    expect(badges.map((el) => el.textContent!.trim())).toEqual([
      'Primário',
      'Secundário',
      'Estabilizador',
    ]);
  });

  it('shows an empty target state', () => {
    showExercise({ ...response, muscleTargets: [] });
    expect(fixture.nativeElement.textContent).toContain('Nenhum músculo alvo foi relacionado');
  });

  it('shows a fallback when the target group is absent from the catalog', () => {
    showExercise();
    groups.next([]);
    groups.complete();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.ic-exercise-detail__target-group').textContent,
    ).toContain('Grupo indisponível');
  });

  it('keeps details available after a group failure and recovers through the retry button', () => {
    showExercise();
    groups.error(new HttpErrorResponse({ status: 500 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Supino reto');
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Não foi possível carregar os grupos musculares',
    );
    expect(navigate).not.toHaveBeenCalled();
    const retry = new Subject<MuscleGroupItemResponse[]>();
    getGroups.mockReturnValue(retry.asObservable());
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    fixture.componentInstance.loadMuscleGroups();
    expect(getGroups).toHaveBeenCalledTimes(2);
    retry.next([{ id: 1, code: 'CHEST', name: 'Peitoral' }]);
    retry.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.ic-exercise-detail__target-group').textContent,
    ).toContain('Peitoral');
  });

  it.each(['abc', '0', '-2', '1.5', 'Infinity', ''])('rejects an invalid route ID (%s)', (id) => {
    route.snapshot.paramMap = convertToParamMap({ id });
    fixture.detectChanges();
    expect(getById).not.toHaveBeenCalled();
    expect(getGroups).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/exercises']);
  });

  it.each([
    [404, { message: 'Exercício não encontrado.' }, 'Exercício não encontrado.'],
    [500, null, 'Não foi possível carregar o exercício.'],
  ])('handles HTTP %s and returns only after the dialog closes', (status, error, message) => {
    fixture.detectChanges();
    request.error(new HttpErrorResponse({ status, error }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();
    expect(openDialog).toHaveBeenCalledExactlyOnceWith({
      title: 'Não foi possível carregar o exercício',
      message,
      primaryAction: 'Ok',
    });
    expect(navigate).not.toHaveBeenCalled();
    dialogClosed.next(true);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/exercises']);
  });

  it('returns to the catalog through the back button', () => {
    showExercise();
    fixture.nativeElement
      .querySelector('button[aria-label="Voltar ao catálogo de exercícios"]')
      .click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/exercises']);
  });

  it('unsubscribes from pending exercise and group requests on destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
    expect(request.observed).toBe(false);
    expect(groups.observed).toBe(false);
    request.next(response);
    expect(fixture.componentInstance.exercise()).toBeNull();
  });
});
