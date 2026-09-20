import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';

import { AuthStateService } from '../../core/auth/auth-state.service';
import { DialogService } from '../../shared/components/dialog/dialog.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { InputComponent } from '../../shared/components/input/input.component';

import { Person, EditableField, SexType } from './profile.models';
import { ProfileService } from './profile.service';

@Component({
  selector: 'app-profile',
  imports: [
    ButtonComponent,
    InputComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private readonly profileService = inject(ProfileService);
  private readonly authState = inject(AuthStateService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);

  readonly currentUser = this.authState.currentUser;
  readonly person = signal<Person | null>(null);
  readonly loading = signal(false);

  constructor() {
    this.loadPerson();
  }

  private loadPerson(): void {
    this.loading.set(true);

    this.profileService
      .getPerson()
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (person) => {
          this.person.set(person);
        },

        error: (error) => {
          const message = error.error?.message ?? 'Não foi possível carregar os dados pessoais.';

          this.dialogService.open({
            title: 'Não foi possível carregar o perfil',
            message,
            primaryAction: 'Ok',
          });
        },
      });
  }

  get sexLabel(): string {
    const person = this.person();

    if (!person) {
      return '';
    }

    return person.sex === 'MALE' ? 'Masculino' : 'Feminino';
  }

  get birthDateLabel(): string {
    const person = this.person();

    if (!person) {
      return '';
    }

    const [year, month, day] = person.birthDate.split('-');

    return `${day}/${month}/${year}`;
  }

  readonly editingField = signal<EditableField | null>(null);
  readonly saving = signal(false);

  nicknameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(30)],
  });

  nameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(100)],
  });

  sexControl = new FormControl<SexType | ''>('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  birthDateControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  private readonly fieldControls: Partial<Record<EditableField, FormControl>> = {
    nickname: this.nicknameControl,
    name: this.nameControl,
    sex: this.sexControl,
    birthDate: this.birthDateControl,
  };

  private getOriginalValue(field: EditableField): string {
    const user = this.currentUser();
    const person = this.person();

    const values: Record<EditableField, string> = {
      nickname: user?.nickname ?? '',
      name: person?.name ?? '',
      sex: person?.sex ?? '',
      birthDate: person?.birthDate ?? '',
    };

    return values[field];
  }

  startEdit(field: EditableField): void {
    if (this.saving()) {
      return;
    }

    const control = this.fieldControls[field];

    if (!control) {
      return;
    }

    control.setValue(this.getOriginalValue(field));
    this.editingField.set(field);
  }

  cancelEdit(): void {
    if (this.saving()) {
      return;
    }

    const field = this.editingField();

    if (field === null) {
      return;
    }

    this.fieldControls[field]?.setValue(this.getOriginalValue(field));
    this.editingField.set(null);
  }

  canSave(field: EditableField): boolean {
    const control = this.fieldControls[field];

    if (!control) {
      return false;
    }

    const value = control.value.trim();
    const originalValue = this.getOriginalValue(field);

    return control.valid && value.length > 0 && value !== originalValue;
  }

  saveNickname(): void {
    const nickname = this.nicknameControl.value.trim();

    if (this.saving() || !this.canSave('nickname')) {
      return;
    }

    this.saving.set(true);

    this.profileService
      .changeNickname({ nickname })
      .pipe(
        finalize(() => {
          this.saving.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const currentUser = this.currentUser();

          if (currentUser) {
            this.authState.setUser({
              ...currentUser,
              nickname: response.nickname,
            });
          }

          this.editingField.set(null);
        },

        error: (error) => {
          const message = error.error?.message ?? 'Não foi possível alterar o nickname.';

          this.dialogService.open({
            title: 'Não foi possível alterar o nickname',
            message,
            primaryAction: 'Ok',
          });
        },
      });
  }

  saveName(): void {
    const name = this.nameControl.value.trim();

    if (this.saving() || !this.canSave('name')) {
      return;
    }

    this.saving.set(true);

    this.profileService
      .updatePerson({ name })
      .pipe(
        finalize(() => {
          this.saving.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const currentPerson = this.person();

          if (currentPerson) {
            this.person.set({
              ...currentPerson,
              name: response.name,
            });
          }

          this.editingField.set(null);
        },

        error: (error) => {
          const message = error.error?.message ?? 'Não foi possível alterar o nome.';

          this.dialogService.open({
            title: 'Não foi possível alterar o nome',
            message,
            primaryAction: 'Ok',
          });
        },
      });
  }

  saveSex(): void {
    const sex = this.sexControl.value;

    if (this.saving() || !this.canSave('sex') || sex === '') {
      return;
    }

    this.saving.set(true);

    this.profileService
      .updatePerson({ sex })
      .pipe(
        finalize(() => {
          this.saving.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const currentPerson = this.person();

          if (currentPerson) {
            this.person.set({
              ...currentPerson,
              sex: response.sex,
            });
          }

          this.editingField.set(null);
        },

        error: (error) => {
          const message = error.error?.message ?? 'Não foi possível alterar o sexo.';

          this.dialogService.open({
            title: 'Não foi possível alterar o sexo',
            message,
            primaryAction: 'Ok',
          });
        },
      });
  }

  saveBirthDate(): void {
    const birthDate = this.birthDateControl.value;

    if (this.saving() || !this.canSave('birthDate')) {
      return;
    }

    this.saving.set(true);

    this.profileService
      .updatePerson({ birthDate })
      .pipe(
        finalize(() => {
          this.saving.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const currentPerson = this.person();

          if (currentPerson) {
            this.person.set({
              ...currentPerson,
              birthDate: response.birthDate,
            });
          }

          this.editingField.set(null);
        },

        error: (error) => {
          const message = error.error?.message ?? 'Não foi possível alterar a data de nascimento.';

          this.dialogService.open({
            title: 'Não foi possível alterar a data de nascimento',
            message,
            primaryAction: 'Ok',
          });
        },
      });
  }

  changePassword(): void {
    void this.router.navigate(['/change-password']);
  }
}
