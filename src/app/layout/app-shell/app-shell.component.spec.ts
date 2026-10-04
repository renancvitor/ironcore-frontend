import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatPaginator, MatPaginatorIntl } from '@angular/material/paginator';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { ThemeService } from '../../core/theme/theme.service';
import { DialogService } from '../../shared/components/dialog/dialog.service';
import { AppShellComponent } from './app-shell.component';

@Component({
  imports: [MatPaginator],
  template: '<mat-paginator [length]="42" [pageSize]="20" />',
})
class PaginationTestPage {}

describe('AppShellComponent', () => {
  let component: AppShellComponent;
  let fixture: ComponentFixture<AppShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([
          { path: 'pagination-one', loadComponent: async () => PaginationTestPage },
          { path: 'pagination-two', loadComponent: async () => PaginationTestPage },
        ]),
        { provide: AuthService, useValue: { logout: vi.fn() } },
        {
          provide: ThemeService,
          useValue: {
            currentTheme: () => 'dark',
            preference: () => 'system',
            setPreference: vi.fn(),
          },
        },
        { provide: DialogService, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the header', () => {
    const header = fixture.nativeElement.querySelector('app-header');

    expect(header).toBeTruthy();
  });

  it('should render the sidebar after the menu is opened', async () => {
    expect(fixture.nativeElement.querySelector('app-sidebar')).toBeNull();

    const menuButton = fixture.nativeElement.querySelector(
      'button[aria-label="Abrir menu"]',
    ) as HTMLButtonElement;
    menuButton.click();
    await fixture.whenStable();

    const sidebar = fixture.nativeElement.querySelector('app-sidebar');

    expect(sidebar).toBeTruthy();
  });

  it('should render the router outlet', () => {
    const outlet = fixture.nativeElement.querySelector('router-outlet');

    expect(outlet).toBeTruthy();
  });

  it('should render the page container', () => {
    const container = fixture.nativeElement.querySelector('.ic-container');

    expect(container).toBeTruthy();
  });

  it('should share Portuguese pagination across lazy child pages without changing the root provider', async () => {
    const router = TestBed.inject(Router);
    const shellIntl = fixture.debugElement.injector.get(MatPaginatorIntl);

    expect(TestBed.inject(MatPaginatorIntl)).not.toBe(shellIntl);

    for (const path of ['/pagination-one', '/pagination-two']) {
      await router.navigateByUrl(path);
      await fixture.whenStable();

      const paginator = fixture.debugElement.query(By.directive(MatPaginator));
      expect(paginator.injector.get(AuthStateService)).toBe(TestBed.inject(AuthStateService));
      expect(paginator.injector.get(AuthService)).toBe(TestBed.inject(AuthService));
      expect(paginator.injector.get(ThemeService)).toBe(TestBed.inject(ThemeService));
      expect(paginator.injector.get(MatPaginatorIntl)).toBe(shellIntl);
      expect(paginator.nativeElement.textContent).toContain('Itens por página');
      expect(paginator.nativeElement.textContent).toContain('1 – 20 de 42');
      expect(
        paginator.nativeElement.querySelector('button[aria-label="Próxima página"]'),
      ).toBeTruthy();
    }
  });
});
