import { TestBed } from '@angular/core/testing';
import { createBodyMetricsForm } from '../body-metrics.form';
import { BodyMetricsFormFieldsComponent } from './body-metrics-form-fields.component';

describe.each(['grid', 'rows'] as const)('BodyMetricsFormFieldsComponent (%s)', (layout) => {
  function render(section: 'main' | 'circumferences' | 'notes') {
    const form = createBodyMetricsForm();
    const fixture = TestBed.createComponent(BodyMetricsFormFieldsComponent);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('section', section);
    fixture.componentRef.setInput('layout', layout);
    fixture.detectChanges();
    return { form, fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('associates labels, required state and errors with the main inputs', () => {
    const { form, fixture, element } = render('main');
    for (const name of ['weightKg', 'heightCm'] as const) {
      const input = element.querySelector<HTMLInputElement>(`#${name}`)!;
      expect(input.labels?.length).toBe(1);
      expect(input.getAttribute('aria-required')).toBe('true');
      expect(element.querySelector(`#${name}-error`)).toBeNull();
      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe(`${name}-error`);
      expect(element.querySelector(`#${name}-error`)?.textContent).toContain('Informe');
      form.controls[name].setValue(100);
      fixture.detectChanges();
      expect(input.value).toBe('100');
      expect(input.getAttribute('aria-invalid')).toBe('false');
      expect(input.hasAttribute('aria-describedby')).toBe(false);
      expect(element.querySelector(`#${name}-error`)).toBeNull();
    }
  });

  it('binds every optional measurement to its own control and clears to null', () => {
    const { form, fixture, element } = render('circumferences');
    const names = [
      'neckCm',
      'chestCm',
      'shoulderCm',
      'armCm',
      'forearmCm',
      'waistCm',
      'hipCm',
      'thighCm',
      'calfCm',
    ] as const;
    expect(element.querySelectorAll('input')).toHaveLength(names.length);
    names.forEach((name, index) => {
      const input = element.querySelector<HTMLInputElement>(`#${name}`)!;
      expect(input.labels?.length).toBe(1);
      expect(input.hasAttribute('aria-required')).toBe(false);
      input.value = String(30 + index);
      input.dispatchEvent(new Event('input'));
    });
    names.forEach((name, index) => expect(form.controls[name].value).toBe(30 + index));
    const input = element.querySelector<HTMLInputElement>('#neckCm')!;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(form.controls.neckCm.value).toBeNull();
    expect(form.controls.neckCm.valid).toBe(true);
    expect(form.controls.calfCm.value).toBe(38);
  });

  it('exposes non-finite values as accessible validation errors', () => {
    const { form, fixture, element } = render('main');
    form.controls.weightKg.setValue(Infinity);
    form.controls.weightKg.markAsTouched();
    fixture.detectChanges();
    expect(element.querySelector('#weightKg-error')?.textContent).toContain(
      'Informe um valor válido.',
    );
    expect(element.querySelector('#weightKg')?.getAttribute('aria-describedby')).toBe(
      'weightKg-error',
    );
  });

  it.each(['main', 'circumferences', 'notes'] as const)(
    'propagates disabling and enabling to %s',
    (section) => {
      const { form, fixture, element } = render(section);
      form.disable({ emitEvent: false });
      fixture.detectChanges();
      const controls = Array.from(
        element.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'),
      );
      expect(controls.length).toBeGreaterThan(0);
      expect(controls.every((control) => control.disabled)).toBe(true);
      form.enable({ emitEvent: false });
      fixture.detectChanges();
      expect(controls.every((control) => !control.disabled)).toBe(true);
    },
  );

  it('binds notes in both directions and keeps their label associated', () => {
    const { form, fixture, element } = render('notes');
    const notes = element.querySelector('textarea')!;
    expect(notes.labels?.length).toBe(1);
    form.controls.notes.setValue('Texto carregado');
    fixture.detectChanges();
    expect(notes.value).toBe('Texto carregado');
    notes.value = 'Texto editado';
    notes.dispatchEvent(new Event('input'));
    expect(form.controls.notes.value).toBe('Texto editado');
  });
});
