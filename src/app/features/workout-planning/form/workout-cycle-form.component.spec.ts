import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createWorkoutCycleForm } from '../workout-cycle.form';
import { cycleDetail } from '../workout-planning.testing';
import { WorkoutCycleFormComponent } from './workout-cycle-form.component';

// Presentation tests intentionally need no HTTP, planning service, dialog or router providers.
describe('WorkoutCycleFormComponent', () => {
  let fixture: ComponentFixture<WorkoutCycleFormComponent>;
  const goals = [{ id: 22, code: 'GOAL', name: 'Objetivo do backend' }];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutCycleFormComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(WorkoutCycleFormComponent);
    fixture.componentRef.setInput(
      'form',
      createWorkoutCycleForm(() => goals),
    );
    fixture.componentRef.setInput('goals', goals);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('uses validation messages instead of required markers, as in login', () => {
    expect(
      fixture.nativeElement.querySelectorAll('.mat-mdc-form-field-required-marker'),
    ).toHaveLength(0);
    const form = fixture.componentInstance.form();
    form.markAllAsTouched();
    fixture.detectChanges();
    expect(form.controls.name.hasError('required')).toBe(true);
    expect(form.controls.trainingGoalId.hasError('required')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Informe o nome.');
    expect(fixture.nativeElement.textContent).toContain('Selecione um objetivo de treino ativo.');
    expect(fixture.nativeElement.querySelector('footer').textContent).toContain('Cancelar');
    expect(fixture.nativeElement.querySelector('footer').textContent).toContain('Salvar ciclo');
  });

  it('emits submit and cancel for the parent to coordinate', () => {
    const submit = vi.fn();
    const cancel = vi.fn();
    fixture.componentInstance.submitted.subscribe(submit);
    fixture.componentInstance.cancelled.subscribe(cancel);
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.nativeElement.querySelector('footer button').click();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('renders loading and emits goals retry', () => {
    fixture.componentRef.setInput('goalsLoading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carregando objetivos');
    fixture.componentRef.setInput('goalsLoading', false);
    fixture.componentRef.setInput('goalsError', true);
    fixture.detectChanges();
    const retry = vi.fn();
    fixture.componentInstance.retryGoals.subscribe(retry);
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows saving and blocks repeated submit events', () => {
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    const submit = vi.fn();
    fixture.componentInstance.submitted.subscribe(submit);
    fixture.componentInstance.submit();
    expect(submit).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Salvando...');
    expect(fixture.nativeElement.querySelector('footer button').disabled).toBe(true);
  });

  it('shows the unavailable current goal without discarding its value', () => {
    fixture.componentRef.setInput('cycle', cycleDetail);
    fixture.componentRef.setInput('goals', []);
    fixture.componentInstance.form().patchValue({ trainingGoalId: 22 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('O objetivo atual está indisponível');
    expect(fixture.componentInstance.form().controls.trainingGoalId.value).toBe(22);
  });
});
