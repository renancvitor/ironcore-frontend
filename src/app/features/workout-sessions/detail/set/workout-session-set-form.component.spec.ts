import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createSessionSetForm } from '../../workout-session-execution.form';
import { SessionSetEditor } from '../workout-session-editor-state.service';
import { WorkoutSessionSetFormComponent } from './workout-session-set-form.component';

describe('WorkoutSessionSetFormComponent', () => {
  let fixture: ComponentFixture<WorkoutSessionSetFormComponent>;
  let row: SessionSetEditor;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WorkoutSessionSetFormComponent] }).compileComponents();
    fixture = TestBed.createComponent(WorkoutSessionSetFormComponent);
    row = { key: 'local-1', setNumber: 2, persisted: null, form: createSessionSetForm(),
      baseline: { actualLoadKg: null, actualReps: null, notes: null },
      error: '', message: '', conflict: false, removed: false, uncertain: null };
    fixture.componentRef.setInput('row', row);
    fixture.componentRef.setInput('activityId', 200);
    fixture.componentRef.setInput('canSave', true);
    fixture.detectChanges();
  });

  it('labels optional execution without prescription values and associates unique numeric IDs', () => {
    const inputs = [...fixture.nativeElement.querySelectorAll('input')] as HTMLInputElement[];
    expect(inputs.map((input) => input.value)).toEqual(['', '']);
    expect(new Set(inputs.map((input) => input.id)).size).toBe(2);
    expect(inputs.every((input) => input.id.includes('200-local-1'))).toBe(true);
    expect(inputs[0].getAttribute('inputmode')).toBe('numeric');
    expect(inputs[1].getAttribute('step')).toBe('0.01');
    for (const input of inputs) expect(fixture.nativeElement.querySelector(`label[for="${input.id}"]`)).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Não registrada');
  });

  it('propagates partial user input and emits only an explicit save intent', () => {
    const save = vi.fn();
    fixture.componentInstance.saved.subscribe(save);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '8';
    input.dispatchEvent(new Event('input'));
    expect(row.form.controls.actualReps.value).toBe(8);
    expect(save).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('shows server errors and operation states close to the preserved fields', () => {
    row.error = 'Falha ao salvar';
    row.form.controls.notes.setValue('Preservar relato');
    fixture.componentRef.setInput('pending', true);
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form').getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Salvando…');
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Falha ao salvar');
    expect(fixture.nativeElement.querySelector('textarea').value).toBe('Preservar relato');
  });

  it('moves focus to the first invalid numeric control on submission', () => {
    row.form.controls.actualReps.setValue(0);
    fixture.componentInstance.saved.subscribe(() => row.form.markAllAsTouched());
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(document.activeElement?.id).toBe('execution-200-local-1-reps');
    expect(fixture.nativeElement.querySelector('mat-error').textContent).toContain('inteiro positivo');
  });

  it('exposes explicit uncertain-result recovery and keeps submission disabled until a read', () => {
    const uncertain = { request: { setNumber: 2, notes: 'Relato' }, reviewed: false };
    row = { ...row, uncertain };
    fixture.componentRef.setInput('row', row);
    fixture.detectChanges();
    const intent = vi.fn();
    fixture.componentInstance.saved.subscribe(intent);
    const save = fixture.nativeElement.querySelector('button[aria-label="Salvar série 2"]') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Gravação não confirmada');
    expect(fixture.nativeElement.textContent).toContain('Consultar registros');
    row = { ...row, uncertain: { ...uncertain, reviewed: true } };
    fixture.componentRef.setInput('row', row);
    fixture.detectChanges();
    expect(save.disabled).toBe(false);
    expect(save.getAttribute('aria-label')).toBe('Tentar registrar novamente a série 2');
    expect(intent).not.toHaveBeenCalled();
    expect(fixture.componentInstance.expanded()).toBe(true);
  });

  it('preserves invalid native numeric input as an error rather than submitting an accidental null', () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    vi.spyOn(input, 'validity', 'get').mockReturnValue({ badInput: true } as ValidityState);
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(row.form.controls.actualReps.hasError('executionNumber')).toBe(true);
    expect(row.form.controls.actualReps.touched).toBe(true);
  });
});
