import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputComponent } from './input.component';

describe('Input', () => {
  let component: InputComponent;
  let fixture: ComponentFixture<InputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InputComponent);
    fixture.componentRef.setInput('id', 'test-input');
    fixture.componentRef.setInput('label', 'Campo de teste');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should use text type by default', () => {
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    expect(input.type).toBe('text');
  });

  it('should apply placeholder', () => {
    fixture.componentRef.setInput('placeholder', 'Digite seu nome');

    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    expect(input.placeholder).toBe('Digite seu nome');
  });

  it('should disable the input', () => {
    fixture.componentRef.setInput('disabled', true);

    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    expect(input.disabled).toBe(true);
  });

  it('should display error message', () => {
    fixture.componentRef.setInput('error', 'Campo obrigatório');

    fixture.detectChanges();

    const error: HTMLElement = fixture.nativeElement.querySelector('.ic-input__error');

    expect(error.textContent).toContain('Campo obrigatório');
  });

  it('should apply error class when error exists', () => {
    fixture.componentRef.setInput('id', 'email');
    fixture.componentRef.setInput('label', 'E-mail');
    fixture.componentRef.setInput('error', 'Campo obrigatório');

    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    expect(input.classList).toContain('ic-input__field--error');
  });

  it('should mark input as invalid when error exists', () => {
    fixture.componentRef.setInput('id', 'email');
    fixture.componentRef.setInput('label', 'E-mail');
    fixture.componentRef.setInput('error', 'Campo obrigatório');

    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('should associate error message with input', () => {
    fixture.componentRef.setInput('id', 'email');
    fixture.componentRef.setInput('label', 'E-mail');
    fixture.componentRef.setInput('error', 'Campo obrigatório');

    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    const error: HTMLElement = fixture.nativeElement.querySelector('.ic-input__error');

    expect(input.getAttribute('aria-describedby')).toBe('email-error');
    expect(error.id).toBe('email-error');
  });

  it('should propagate value changes', () => {
    const onChange = vi.fn();

    component.registerOnChange(onChange);

    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    input.value = 'Renan';
    input.dispatchEvent(new Event('input'));

    expect(onChange).toHaveBeenCalledWith('Renan');
  });

  it('should mark as touched on blur', () => {
    const onTouched = vi.fn();

    component.registerOnTouched(onTouched);

    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    input.dispatchEvent(new Event('blur'));

    expect(onTouched).toHaveBeenCalled();
  });
});
