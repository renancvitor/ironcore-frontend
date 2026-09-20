import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { AuthStateService } from '../../core/auth/auth-state.service';
import { AuthenticatedUser } from '../../core/auth/auth.models';
import { DialogService } from '../../shared/components/dialog/dialog.service';
import { Person } from './profile.models';
import { ProfileComponent } from './profile.component';
import { ProfileService } from './profile.service';

describe('ProfileComponent', () => {
  const user: AuthenticatedUser = {
    userId: 1,
    email: 'renan@ironcore.test',
    nickname: 'renan',
    mustChangePassword: false,
  };
  const person: Person = {
    personId: 1,
    name: 'Renan Vitor',
    sex: 'MALE',
    birthDate: '1990-01-02',
  };
  const getPerson = vi.fn();
  const changeNickname = vi.fn();
  const updatePerson = vi.fn();
  const navigate = vi.fn();
  const openDialog = vi.fn();

  let authState: AuthStateService;
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;

  beforeEach(async () => {
    getPerson.mockReset();
    changeNickname.mockReset();
    updatePerson.mockReset();
    navigate.mockReset();
    openDialog.mockReset();
    getPerson.mockReturnValue(of(person));

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        { provide: ProfileService, useValue: { getPerson, changeNickname, updatePerson } },
        { provide: Router, useValue: { navigate } },
        { provide: DialogService, useValue: { open: openDialog } },
      ],
    }).compileComponents();

    authState = TestBed.inject(AuthStateService);
    authState.setUser(user);
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should load and display the distinct User and Person data', () => {
    createComponent();

    expect(getPerson).toHaveBeenCalledOnce();
    expect(component.loading()).toBe(false);
    expect(component.person()).toEqual(person);
    expect(component.sexLabel).toBe('Masculino');
    expect(component.birthDateLabel).toBe('02/01/1990');
    expect(fixture.nativeElement.textContent).toContain(user.nickname);
    expect(fixture.nativeElement.textContent).toContain(person.name);
  });

  it('should keep the profile loading until the person request completes', () => {
    const result = new Subject<Person>();
    getPerson.mockReturnValue(result);

    createComponent();

    expect(component.loading()).toBe(true);

    result.next(person);
    result.complete();

    expect(component.loading()).toBe(false);
    expect(component.person()).toEqual(person);
  });

  it('should show the backend error when the person cannot be loaded', () => {
    getPerson.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ error: { message: 'Perfil indisponível.' }, status: 500 }),
      ),
    );

    createComponent();

    expect(component.loading()).toBe(false);
    expect(openDialog).toHaveBeenCalledWith({
      title: 'Não foi possível carregar o perfil',
      message: 'Perfil indisponível.',
      primaryAction: 'Ok',
    });
  });

  it('should trim and save a new nickname in the authenticated session', () => {
    const result = new Subject<{ nickname: string }>();
    changeNickname.mockReturnValue(result);
    createComponent();
    component.startEdit('nickname');
    component.nicknameControl.setValue(' renan.dev ');

    component.saveNickname();

    expect(changeNickname).toHaveBeenCalledWith({ nickname: 'renan.dev' });
    expect(component.saving()).toBe(true);

    result.next({ nickname: 'renan.dev' });
    result.complete();

    expect(authState.currentUser()?.nickname).toBe('renan.dev');
    expect(component.editingField()).toBeNull();
    expect(component.saving()).toBe(false);
  });

  it('should prevent nickname submission when its value is unchanged or invalid', () => {
    createComponent();
    component.startEdit('nickname');

    component.saveNickname();
    component.nicknameControl.setValue('x'.repeat(31));
    component.saveNickname();

    expect(changeNickname).not.toHaveBeenCalled();
  });

  it('should retain the current session when nickname update fails', () => {
    changeNickname.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ error: { message: 'Nickname já existe.' }, status: 409 }),
      ),
    );
    createComponent();
    component.startEdit('nickname');
    component.nicknameControl.setValue('taken');

    component.saveNickname();

    expect(authState.currentUser()).toEqual(user);
    expect(component.editingField()).toBe('nickname');
    expect(component.saving()).toBe(false);
    expect(openDialog).toHaveBeenCalledWith({
      title: 'Não foi possível alterar o nickname',
      message: 'Nickname já existe.',
      primaryAction: 'Ok',
    });
  });

  it('should update each permitted Person field without changing User data', () => {
    updatePerson
      .mockReturnValueOnce(of({ name: 'Novo nome', sex: person.sex, birthDate: person.birthDate }))
      .mockReturnValueOnce(of({ name: 'Novo nome', sex: 'FEMALE', birthDate: person.birthDate }))
      .mockReturnValueOnce(of({ name: 'Novo nome', sex: 'FEMALE', birthDate: '1991-03-04' }));
    createComponent();

    component.startEdit('name');
    component.nameControl.setValue(' Novo nome ');
    component.saveName();

    component.startEdit('sex');
    component.sexControl.setValue('FEMALE');
    component.saveSex();

    component.startEdit('birthDate');
    component.birthDateControl.setValue('1991-03-04');
    component.saveBirthDate();

    expect(updatePerson).toHaveBeenNthCalledWith(1, { name: 'Novo nome' });
    expect(updatePerson).toHaveBeenNthCalledWith(2, { sex: 'FEMALE' });
    expect(updatePerson).toHaveBeenNthCalledWith(3, { birthDate: '1991-03-04' });
    expect(component.person()).toEqual({
      ...person,
      name: 'Novo nome',
      sex: 'FEMALE',
      birthDate: '1991-03-04',
    });
    expect(authState.currentUser()).toEqual(user);
  });

  it('should restore the original value when editing is cancelled', () => {
    createComponent();
    component.startEdit('name');
    component.nameControl.setValue('Valor temporário');

    component.cancelEdit();

    expect(component.nameControl.value).toBe(person.name);
    expect(component.editingField()).toBeNull();
  });

  it('should navigate to the password change flow', () => {
    createComponent();

    component.changePassword();

    expect(navigate).toHaveBeenCalledWith(['/change-password']);
  });
});
