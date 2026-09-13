import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Subject, throwError } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { FirstAccessComponent } from './first-access.component';

describe('FirstAccessComponent', () => {
  const initialChangePassword = vi.fn();
  const navigate = vi.fn();
  const email = 'renan@ironcore.test';
  const validFormValue = {
    email,
    currentPassword: 'current-password',
    newPassword: 'new-password',
    confirmNewPassword: 'new-password',
  };

  let component: FirstAccessComponent;
  let fixture: ComponentFixture<FirstAccessComponent>;

  beforeEach(async () => {
    initialChangePassword.mockReset();
    navigate.mockReset();

    await TestBed.configureTestingModule({
      imports: [FirstAccessComponent],
      providers: [
        { provide: AuthService, useValue: { initialChangePassword } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ email }) } },
        },
        { provide: Router, useValue: { navigate } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FirstAccessComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should prefill the email received from login', () => {
    expect(component.form.controls.email.value).toBe(email);
  });

  it('should configure the first-access form fields', () => {
    fixture.detectChanges();

    const [emailInput, currentPassword, newPassword, confirmation] =
      fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(emailInput.type).toBe('email');
    expect(emailInput.autocomplete).toBe('email');
    expect(currentPassword.autocomplete).toBe('current-password');
    expect(newPassword.autocomplete).toBe('new-password');
    expect(confirmation.autocomplete).toBe('new-password');
    expect(button.type).toBe('submit');
  });

  it('should not submit an invalid form and should mark all fields as touched', () => {
    component.form.controls.email.setValue('invalid-email');

    component.submit();

    expect(initialChangePassword).not.toHaveBeenCalled();
    expect(component.form.controls.email.touched).toBe(true);
    expect(component.form.controls.currentPassword.touched).toBe(true);
    expect(component.form.controls.newPassword.touched).toBe(true);
    expect(component.form.controls.confirmNewPassword.touched).toBe(true);
    expect(component.form.controls.email.hasError('email')).toBe(true);
  });

  it('should require passwords with at least eight characters', () => {
    component.form.setValue({
      ...validFormValue,
      currentPassword: 'short',
      newPassword: 'short',
      confirmNewPassword: 'short',
    });

    expect(component.form.controls.currentPassword.hasError('minlength')).toBe(true);
    expect(component.form.controls.newPassword.hasError('minlength')).toBe(true);
    expect(component.form.controls.confirmNewPassword.hasError('minlength')).toBe(true);
  });

  it('should reject a new password equal to the current password', () => {
    component.form.setValue({
      ...validFormValue,
      newPassword: validFormValue.currentPassword,
      confirmNewPassword: validFormValue.currentPassword,
    });

    expect(component.form.hasError('sameAsCurrentPassword')).toBe(true);
  });

  it('should reject a password confirmation that does not match', () => {
    component.form.setValue({ ...validFormValue, confirmNewPassword: 'another-password' });

    expect(component.form.hasError('passwordMismatch')).toBe(true);
  });

  it('should submit valid data and show loading until the request completes', () => {
    const result = new Subject<void>();
    initialChangePassword.mockReturnValue(result);
    component.form.setValue(validFormValue);

    component.submit();
    fixture.detectChanges();

    expect(initialChangePassword).toHaveBeenCalledWith(validFormValue);
    expect(component.loading).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Alterando senha...');

    result.complete();

    expect(component.loading).toBe(false);
  });

  it('should return to login after a successful password change', () => {
    const result = new Subject<void>();
    initialChangePassword.mockReturnValue(result);
    component.form.setValue(validFormValue);

    component.submit();
    result.next();

    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should display the message returned by the backend after a failed password change', () => {
    initialChangePassword.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ error: { message: 'Credenciais inválidas.' }, status: 401 }),
      ),
    );
    component.form.setValue(validFormValue);

    component.submit();
    fixture.detectChanges();

    const alert: HTMLElement = fixture.nativeElement.querySelector('[role="alert"]');

    expect(component.loading).toBe(false);
    expect(alert.textContent?.trim()).toBe('Credenciais inválidas.');
    expect(navigate).not.toHaveBeenCalled();
  });
});
