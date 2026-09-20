import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ProfileService } from '../profile.service';
import { Router } from '@angular/router';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { ChangePasswordRequest } from '../profile.models';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { InputComponent } from '../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { ToastService } from '../../../shared/components/toast/toast.service';

function changePasswordValidator(control: AbstractControl): ValidationErrors | null {
  const currentPassword = control.get('currentPassword')?.value;
  const newPassword = control.get('newPassword')?.value;
  const confirmNewPassword = control.get('confirmNewPassword')?.value;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return null;
  }

  if (newPassword !== confirmNewPassword) {
    return { passwordMismatch: true };
  }

  if (newPassword === currentPassword) {
    return { sameAsCurrentPassword: true };
  }

  return null;
}

@Component({
  selector: 'app-change-password',
  imports: [InputComponent, ButtonComponent, LoadingComponent, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent {
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(DialogService);

  loading = false;

  readonly form = new FormGroup(
    {
      currentPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8)],
      }),

      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8)],
      }),

      confirmNewPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8)],
      }),
    },
    {
      validators: [changePasswordValidator],
    },
  );

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const request: ChangePasswordRequest = this.form.getRawValue();

    this.profileService
      .changePassword(request)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/profile']).then((navigated) => {
            if (navigated) {
              this.toastService.success('Senha alterada com sucesso.');
            }
          });
        },

        error: (error: HttpErrorResponse) => {
          const message = error.error?.message ?? 'Ocorreu um erro ao alterar a senha.';

          this.dialogService.open({
            title: 'Não foi possível alterar a senha',
            message,
            primaryAction: 'Ok',
          });
        },
      });
  }

  cancel(): void {
    void this.router.navigate(['/profile']);
  }
}
