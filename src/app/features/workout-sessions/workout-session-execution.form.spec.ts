import { FormControl } from '@angular/forms';
import {
  activityExecutionValue, buildSessionSetPatch, createSessionActivityForm, createSessionSetForm,
  executionChanges, hasSetExecution, optionalExecutionDecimal, optionalExecutionInteger, setExecutionValue,
} from './workout-session-execution.form';

describe('Workout Session execution forms and PATCH contracts', () => {
  it('starts with absent execution, never a prescription or zero', () => {
    expect(setExecutionValue(createSessionSetForm())).toEqual({ actualLoadKg: null, actualReps: null, notes: null });
    expect(activityExecutionValue(createSessionActivityForm())).toEqual({ actualDurationMinutes: null, actualDistanceKm: null, notes: null });
    expect(hasSetExecution(setExecutionValue(createSessionSetForm()))).toBe(false);
  });

  it.each([
    { actualReps: 8, actualLoadKg: null, notes: null },
    { actualReps: null, actualLoadKg: 0, notes: null },
    { actualReps: null, actualLoadKg: null, notes: 'Somente relato' },
  ])('accepts partial set execution %j', (value) => {
    const form = createSessionSetForm(value);
    expect(form.valid).toBe(true);
    expect(hasSetExecution(setExecutionValue(form))).toBe(true);
  });

  it('distinguishes zero from absent distance and accepts duration independently', () => {
    const form = createSessionActivityForm();
    form.controls.actualDistanceKm.setValue(0);
    expect(form.valid).toBe(true);
    expect(activityExecutionValue(form).actualDurationMinutes).toBeNull();
    form.controls.actualDistanceKm.setValue(null);
    form.controls.actualDurationMinutes.setValue(1);
    expect(form.valid).toBe(true);
    expect(activityExecutionValue(form).actualDistanceKm).toBeNull();
  });

  it.each([null, 1, 2147483647])('accepts execution integer %s', (value) => {
    expect(new FormControl(value, optionalExecutionInteger).valid).toBe(true);
  });
  it.each([0, -1, 1.5, 2147483648, NaN, Infinity, '8', ''])('rejects execution integer %s', (value) => {
    expect(new FormControl(value, optionalExecutionInteger).invalid).toBe(true);
  });
  it.each([null, 0, 0.01, 20.25, 999999.99])('accepts execution decimal %s', (value) => {
    expect(new FormControl(value, optionalExecutionDecimal).valid).toBe(true);
  });
  it.each([-0.01, 0.001, 20.255, 1000000, NaN, Infinity, '2.5', ''])('rejects execution decimal %s', (value) => {
    expect(new FormControl(value, optionalExecutionDecimal).invalid).toBe(true);
  });

  it('omits unchanged fields and explicitly clears changed fields', () => {
    const baseline = { actualLoadKg: 20, actualReps: 8, notes: 'Preservar' };
    expect(buildSessionSetPatch({ ...baseline, actualReps: 9 }, baseline, 'TOTAL')).toEqual({ actualReps: 9 });
    expect(buildSessionSetPatch({ ...baseline, notes: null }, baseline, 'TOTAL')).toEqual({ notes: null });
    expect(buildSessionSetPatch({ ...baseline, actualLoadKg: null }, baseline, 'TOTAL')).toEqual({ actualLoadKg: null, actualLoadMode: null });
    expect(buildSessionSetPatch(baseline, baseline, 'TOTAL')).toEqual({});
  });

  it('requires mode in the payload when adding load to a previously unloaded set', () => {
    const baseline = { actualLoadKg: null, actualReps: 8, notes: null };
    expect(buildSessionSetPatch({ ...baseline, actualLoadKg: 10 }, baseline, 'PER_SIDE'))
      .toEqual({ actualLoadKg: 10, actualLoadMode: 'PER_SIDE' });
  });

  it('builds independent activity changes and treats blank notes as absent', () => {
    const baseline = { actualDurationMinutes: 10, actualDistanceKm: 2, notes: 'Anterior' };
    const form = createSessionActivityForm(baseline);
    form.controls.actualDistanceKm.setValue(null);
    expect(executionChanges(activityExecutionValue(form), baseline)).toEqual({ actualDistanceKm: null });
    const set = createSessionSetForm();
    set.controls.notes.setValue('   ');
    expect(hasSetExecution(setExecutionValue(set))).toBe(false);
  });
});
