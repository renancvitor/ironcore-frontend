import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { MatExpansionPanel } from '@angular/material/expansion';

import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([{ path: 'body-metrics', component: SidebarComponent }])],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the main navigation', () => {
    const nav = fixture.nativeElement.querySelector('.ic-sidebar') as HTMLElement;

    expect(nav).toBeTruthy();
  });

  it('should render the profile navigation link', () => {
    const link = fixture.nativeElement.querySelector('a[href="/profile"]') as HTMLAnchorElement;

    expect(link.textContent).toContain('Perfil');
    expect(link.getAttribute('href')).toBe('/profile');
  });

  it('should render the body metrics history link', () => {
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector(
      'a[href="/body-metrics"]',
    ) as HTMLAnchorElement;

    expect(link.textContent).toContain('Histórico');
  });

  it('should expand the body metrics group on the history route', async () => {
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/body-metrics');
    fixture.detectChanges();
    await fixture.whenStable();

    const panel = fixture.debugElement.query(By.directive(MatExpansionPanel))
      .componentInstance as MatExpansionPanel;

    expect(panel.expanded).toBe(true);
  });
});
