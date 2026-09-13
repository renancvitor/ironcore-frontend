import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { InitialChangePasswordRequest } from '../../../core/auth/auth.models';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { DialogService } from '../../../shared/components/dialog/dialog.service';

function firstAccessPasswordValidator(control: AbstractControl): ValidationErrors | null {
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
  selector: 'app-first-access',
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './first-access.component.html',
  styleUrl: './first-access.component.scss',
})
export class FirstAccessComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogService = inject(DialogService);

  loading = false;
  errorMessage = '';

  readonly form = new FormGroup(
    {
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),

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
      validators: [firstAccessPasswordValidator],
    },
  );

  constructor() {
    const email = this.route.snapshot.queryParamMap.get('email');

    if (email) {
      this.form.controls.email.setValue(email);
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const request: InitialChangePasswordRequest = this.form.getRawValue();

    this.authService
      .initialChangePassword(request)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/login']);
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
}
