import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent', () => {
  let component: AppShellComponent;
  let fixture: ComponentFixture<AppShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [provideRouter([])],
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
});
