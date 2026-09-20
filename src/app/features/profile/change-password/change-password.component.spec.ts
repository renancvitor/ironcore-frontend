import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, throwError } from 'rxjs';

import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ProfileService } from '../profile.service';
import { ChangePasswordComponent } from './change-password.component';

describe('ChangePasswordComponent', () => {
  const changePassword = vi.fn();
  const navigate = vi.fn();
  const openDialog = vi.fn();
  const success = vi.fn();
  const validFormValue = {
    currentPassword: 'current-password',
    newPassword: 'new-password',
    confirmNewPassword: 'new-password',
  };

  let component: ChangePasswordComponent;
  let fixture: ComponentFixture<ChangePasswordComponent>;

  beforeEach(async () => {
    changePassword.mockReset();
    navigate.mockReset();
    openDialog.mockReset();
    success.mockReset();
    navigate.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [
        { provide: ProfileService, useValue: { changePassword } },
        { provide: Router, useValue: { navigate } },
        { provide: DialogService, useValue: { open: openDialog } },
        { provide: ToastService, useValue: { success } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should mark all fields as touched without submitting an invalid form', () => {
    component.submit();

    expect(changePassword).not.toHaveBeenCalled();
    expect(component.form.controls.currentPassword.touched).toBe(true);
    expect(component.form.controls.newPassword.touched).toBe(true);
    expect(component.form.controls.confirmNewPassword.touched).toBe(true);
  });

  it('should validate password length, confirmation and difference from the current password', () => {
    component.form.setValue({
      currentPassword: 'short',
      newPassword: 'short',
      confirmNewPassword: 'different',
    });

    expect(component.form.controls.currentPassword.hasError('minlength')).toBe(true);
    expect(component.form.controls.newPassword.hasError('minlength')).toBe(true);
    expect(component.form.hasError('passwordMismatch')).toBe(true);

    component.form.setValue({
      ...validFormValue,
      newPassword: validFormValue.currentPassword,
      confirmNewPassword: validFormValue.currentPassword,
    });

    expect(component.form.hasError('sameAsCurrentPassword')).toBe(true);
  });

  it('should submit valid data once and display the loading component until completion', () => {
    const result = new Subject<void>();
    changePassword.mockReturnValue(result);
    component.form.setValue(validFormValue);

    component.submit();
    component.submit();
    fixture.detectChanges();

    expect(changePassword).toHaveBeenCalledOnce();
    expect(changePassword).toHaveBeenCalledWith(validFormValue);
    expect(component.loading).toBe(true);
    expect(fixture.nativeElement.querySelector('app-loading')).toBeTruthy();

    result.complete();

    expect(component.loading).toBe(false);
  });

  it('should return to profile and notify success after a successful password change', async () => {
    const result = new Subject<void>();
    changePassword.mockReturnValue(result);
    component.form.setValue(validFormValue);

    component.submit();
    result.next();
    await Promise.resolve();

    expect(navigate).toHaveBeenCalledWith(['/profile']);
    expect(success).toHaveBeenCalledWith('Senha alterada com sucesso.');
  });

  it('should show the backend error without navigating after a failed password change', () => {
    changePassword.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ error: { message: 'Senha atual inválida.' }, status: 400 }),
      ),
    );
    component.form.setValue(validFormValue);

    component.submit();

    expect(component.loading).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(openDialog).toHaveBeenCalledWith({
      title: 'Não foi possível alterar a senha',
      message: 'Senha atual inválida.',
      primaryAction: 'Ok',
    });
  });

  it('should cancel back to profile without submitting', () => {
    component.cancel();

    expect(changePassword).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/profile']);
  });
});
