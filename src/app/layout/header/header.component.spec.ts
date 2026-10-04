import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { Subject, throwError } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { ThemePreference } from '../../core/theme/theme.models';
import { DialogService } from '../../shared/components/dialog/dialog.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  const logout = vi.fn();
  const openDialog = vi.fn();
  const preference = signal<ThemePreference>('system');
  const setPreference = vi.fn();
  const currentTheme = signal<'light' | 'dark'>('dark');

  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    logout.mockReset();
    openDialog.mockReset();
    preference.set('system');
    setPreference.mockReset().mockImplementation((value: ThemePreference) => preference.set(value));
    currentTheme.set('dark');

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { logout } },
        {
          provide: ThemeService,
          useValue: {
            currentTheme: currentTheme.asReadonly(),
            preference: preference.asReadonly(),
            setPreference,
          },
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

  it('should expose the body metrics history link', () => {
    const link = fixture.nativeElement.querySelector(
      'a[aria-label="Medidas corporais"]',
    ) as HTMLAnchorElement;

    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/body-metrics');
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

  it('should cycle system, light and dark with matching icons and accessible labels', () => {
    const button = fixture.nativeElement.querySelector('.ic-header__theme') as HTMLButtonElement;
    const icon = button.querySelector('mat-icon')!;
    expect(icon.textContent?.trim()).toBe('computer');
    expect(button.getAttribute('aria-label')).toBe('Tema: sistema (escuro). Alterar para claro');
    button.click();
    fixture.detectChanges();
    expect(setPreference).toHaveBeenLastCalledWith('light');
    expect(icon.textContent?.trim()).toBe('light_mode');
    expect(button.getAttribute('aria-label')).toBe('Tema: claro. Alterar para escuro');
    button.click();
    fixture.detectChanges();
    expect(setPreference).toHaveBeenLastCalledWith('dark');
    expect(icon.textContent?.trim()).toBe('dark_mode');
    expect(button.getAttribute('aria-label')).toBe('Tema: escuro. Alterar para sistema');
    button.click();
    fixture.detectChanges();
    expect(setPreference).toHaveBeenLastCalledWith('system');
    expect(icon.textContent?.trim()).toBe('computer');
  });

  it('should keep the system icon when the effective theme changes', () => {
    currentTheme.set('light');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.ic-header__theme') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('computer');
    expect(button.getAttribute('aria-label')).toBe('Tema: sistema (claro). Alterar para claro');
  });
});
