import { ComponentFixture, TestBed } from '@angular/core/testing';
import { buildWorkoutActivityRequest, createWorkoutActivityForm } from '../workout-activity.form';
import { cycleDetail } from '../workout-planning.testing';
import { WorkoutActivityFormComponent } from './workout-activity-form.component';

describe('WorkoutActivityFormComponent hybrid prescription', () => {
  let fixture: ComponentFixture<WorkoutActivityFormComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutActivityFormComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(WorkoutActivityFormComponent);
    fixture.componentRef.setInput('form', createWorkoutActivityForm());
    fixture.componentRef.setInput('exerciseName', 'Exercício híbrido');
    fixture.detectChanges();
  });

  it('renders every optional field at once and accepts an empty prescription', () => {
    expect(fixture.nativeElement.querySelectorAll('input[type="number"]')).toHaveLength(7);
    for (const name of [
      'sets',
      'repRangeMin',
      'repRangeMax',
      'targetLoadKg',
      'targetLoadText',
      'durationMinutes',
      'distanceKm',
      'intensityText',
      'restSeconds',
      'notes',
    ]) {
      expect(
        fixture.nativeElement.querySelector(`[formcontrolname="${name}"], #activity-${name}`),
      ).not.toBeNull();
    }
    const form = fixture.componentInstance.form();
    expect(form.valid).toBe(true);
    expect(buildWorkoutActivityRequest(form, 10)).toEqual({
      exerciseId: 10,
      sets: null,
      repRangeMin: null,
      repRangeMax: null,
      targetLoadKg: null,
      targetLoadText: null,
      durationMinutes: null,
      distanceKm: null,
      intensityText: null,
      restSeconds: null,
      notes: null,
    });
  });

  it.each([
    { sets: 3, repRangeMin: 8, durationMinutes: 5 },
    { targetLoadKg: 0.1, targetLoadText: 'Leve', durationMinutes: 20 },
    { distanceKm: 0.01, intensityText: 'Alta', sets: 2, restSeconds: 30 },
    {
      sets: 4,
      repRangeMin: 8,
      repRangeMax: 12,
      targetLoadKg: 2.25,
      targetLoadText: 'RPE 8',
      durationMinutes: 15,
      distanceKm: 1.5,
      intensityText: 'Moderada',
      restSeconds: 60,
      notes: 'Controle',
    },
  ])('accepts combined fields without clearing any value: %j', (values) => {
    const form = fixture.componentInstance.form();
    form.patchValue(values);
    expect(form.valid).toBe(true);
    expect(buildWorkoutActivityRequest(form, 10)).toEqual(expect.objectContaining(values));
    expect(Object.values(form.controls).every((control) => control.enabled)).toBe(true);
  });

  it.each(['sets', 'repRangeMin', 'repRangeMax', 'durationMinutes', 'restSeconds'] as const)(
    'requires positive finite integers for %s when present',
    (name) => {
      const control = fixture.componentInstance.form().controls[name];
      for (const value of [0, -1, 1.5, NaN, Infinity, -Infinity]) {
        control.setValue(value);
        expect(control.invalid).toBe(true);
      }
      control.setValue(1);
      expect(control.valid).toBe(true);
      control.setValue(null);
      expect(control.valid).toBe(true);
    },
  );

  it.each(['targetLoadKg', 'distanceKm'] as const)(
    'accepts positive decimals for %s without an invented minimum',
    (name) => {
      const control = fixture.componentInstance.form().controls[name];
      for (const value of [0, -0.01, NaN, Infinity]) {
        control.setValue(value);
        expect(control.invalid).toBe(true);
      }
      for (const value of [null, 0.001, 1, 123456.789]) {
        control.setValue(value);
        expect(control.valid).toBe(true);
      }
    },
  );

  it('validates the repetition range only when both ends exist and displays the error', () => {
    const form = fixture.componentInstance.form();
    form.patchValue({ repRangeMin: 12, repRangeMax: 8 });
    form.markAllAsTouched();
    fixture.detectChanges();
    expect(form.hasError('repRange')).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'mínimo de repetições',
    );
    for (const values of [
      { repRangeMin: 8, repRangeMax: 8 },
      { repRangeMin: null, repRangeMax: 8 },
      { repRangeMin: 12, repRangeMax: null },
    ]) {
      form.patchValue(values);
      expect(form.valid).toBe(true);
    }
  });

  it('maps whitespace text to null and clears numeric inputs to null through the UI', () => {
    const form = fixture.componentInstance.form();
    form.patchValue({ sets: 3, targetLoadText: '  ', intensityText: '\t', notes: '  ' });
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#activity-sets') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(buildWorkoutActivityRequest(form, 10)).toEqual(
      expect.objectContaining({
        sets: null,
        targetLoadText: null,
        intensityText: null,
        notes: null,
      }),
    );
  });

  it('preserves all persisted prescription fields for editing and delegates submit', () => {
    const activity = cycleDetail.days[0].activities[0];
    fixture.componentRef.setInput('form', createWorkoutActivityForm(activity));
    fixture.componentRef.setInput('editing', true);
    fixture.detectChanges();
    const form = fixture.componentInstance.form();
    const request = buildWorkoutActivityRequest(form, activity.exercise.id);
    for (const key of Object.keys(form.controls) as (keyof typeof form.controls)[])
      expect(request[key]).toEqual(activity[key]);
    const submit = vi.fn();
    fixture.componentInstance.submitted.subscribe(submit);
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(submit).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('disables fields and actions and blocks submission while saving', async () => {
    const component = fixture.componentInstance;
    const submit = vi.fn();
    component.submitted.subscribe(submit);
    fixture.componentRef.setInput('editing', true);
    fixture.componentRef.setInput('saving', true);
    component.form().disable();
    await fixture.whenStable();
    fixture.detectChanges();
    component.submit();
    expect(submit).not.toHaveBeenCalled();
    expect(
      Array.from(
        fixture.nativeElement.querySelectorAll(
          'input,textarea,button',
        ) as NodeListOf<HTMLInputElement>,
      ).every((element) => element.disabled),
    ).toBe(true);
    expect(fixture.nativeElement.querySelector('form').getAttribute('aria-busy')).toBe('true');
  });
});
