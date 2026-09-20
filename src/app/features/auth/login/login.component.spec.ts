import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, throwError } from 'rxjs';

import { LoginResponse } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  const login = vi.fn();
  const navigate = vi.fn();
  const openDialog = vi.fn();

  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    login.mockReset();
    navigate.mockReset();
    openDialog.mockReset();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        {
          provide: AuthService,
          useValue: { login },
        },
        {
          provide: Router,
          useValue: { navigate },
        },
        {
          provide: DialogService,
          useValue: { open: openDialog },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should configure the form fields for login', () => {
    fixture.detectChanges();

    const [email, password] = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(email.type).toBe('email');
    expect(email.autocomplete).toBe('email');
    expect(password.type).toBe('password');
    expect(password.autocomplete).toBe('current-password');
    expect(button.type).toBe('submit');
  });

  it('should not submit an invalid form and should display validation errors', () => {
    component.submit();
    fixture.detectChanges();

    expect(login).not.toHaveBeenCalled();
    expect(component.form.controls.email.touched).toBe(true);
    expect(component.form.controls.password.touched).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('E-mail é obrigatório.');
    expect(fixture.nativeElement.textContent).toContain('Senha é obrigatória.');
  });

  it('should submit valid credentials and show loading until the request completes', () => {
    const result = new Subject<LoginResponse>();
    login.mockReturnValue(result);
    component.form.setValue({ email: 'renan@ironcore.test', password: 'password' });

    component.submit();
    fixture.detectChanges();

    expect(login).toHaveBeenCalledWith({ email: 'renan@ironcore.test', password: 'password' });
    expect(component.loading).toBe(true);
    expect(fixture.nativeElement.querySelector('app-loading')).toBeTruthy();

    result.complete();

    expect(component.loading).toBe(false);
  });

  it('should display the message returned by the backend after a failed login', () => {
    login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            error: { message: 'Credenciais inválidas.' },
            status: 401,
          }),
      ),
    );
    component.form.setValue({ email: 'renan@ironcore.test', password: 'wrong-password' });

    component.submit();
    fixture.detectChanges();

    expect(component.loading).toBe(false);
    expect(openDialog).toHaveBeenCalledWith({
      title: 'N\u00e3o foi poss\u00edvel entrar',
      message: 'Credenciais inv\u00e1lidas.',
      primaryAction: 'Ok',
    });
  });

  it('should redirect to the protected area after a successful login', () => {
    const result = new Subject<LoginResponse>();
    login.mockReturnValue(result);
    component.form.setValue({ email: 'renan@ironcore.test', password: 'password' });

    component.submit();
    result.next({} as LoginResponse);

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('should redirect to first access when the backend requires the initial password change', () => {
    login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            error: { message: 'Troca de senha inicial obrigatória.' },
            status: 401,
          }),
      ),
    );
    component.form.setValue({ email: 'renan@ironcore.test', password: 'password' });

    component.submit();

    expect(navigate).toHaveBeenCalledWith(['/first-access'], {
      queryParams: { email: 'renan@ironcore.test' },
    });
    expect(component.errorMessage).toBe('');
  });
});
