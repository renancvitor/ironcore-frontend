import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { Subject, throwError } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { DialogService } from '../../shared/components/dialog/dialog.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  const logout = vi.fn();
  const openDialog = vi.fn();
  const setTheme = vi.fn();
  const currentTheme = signal<'light' | 'dark'>('dark');

  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    logout.mockReset();
    openDialog.mockReset();
    setTheme.mockReset();
    currentTheme.set('dark');

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { logout } },
        {
          provide: ThemeService,
          useValue: { currentTheme: currentTheme.asReadonly(), setTheme },
        },
        { provide: DialogService, useValue: { open: openDialog } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the profile navigation link', () => {
    const profileLink = fixture.nativeElement.querySelector(
      'a[aria-label="Meu perfil"]',
    ) as HTMLAnchorElement;

    expect(profileLink).toBeTruthy();
    expect(profileLink.getAttribute('href')).toBe('/profile');
  });

  it('should log out and redirect to login after the request succeeds', () => {
    const result = new Subject<void>();
    logout.mockReturnValue(result);

    const logoutButton = fixture.nativeElement.querySelector(
      'button[aria-label="Sair da conta"]',
    ) as HTMLButtonElement;
    logoutButton.click();

    expect(logout).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();

    result.next();

    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should redirect to login when logout returns unauthorized', () => {
    logout.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );

    component.logout();

    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(openDialog).not.toHaveBeenCalled();
  });

  it('should show the backend message and keep the user in place when logout fails', () => {
    logout.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ error: { message: 'Serviço indisponível.' }, status: 500 }),
      ),
    );

    component.logout();

    expect(navigate).not.toHaveBeenCalled();
    expect(openDialog).toHaveBeenCalledWith({
      title: 'Não foi possível sair da conta',
      message: 'Serviço indisponível.',
      primaryAction: 'Ok',
    });
  });

  it('should use the default message when logout fails without a backend message', () => {
    logout.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' })),
    );

    component.logout();

    expect(openDialog).toHaveBeenCalledWith({
      title: 'Não foi possível sair da conta',
      message: 'Não foi possível encerrar a sessão.',
      primaryAction: 'Ok',
    });
  });

  it('should update the theme from the toggle state', () => {
    component.changeTheme(false);
    component.changeTheme(true);

    expect(setTheme).toHaveBeenNthCalledWith(1, 'light');
    expect(setTheme).toHaveBeenNthCalledWith(2, 'dark');
  });
});
