import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatExpansionPanel } from '@angular/material/expansion';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';

import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([
          { path: 'body-metrics', component: SidebarComponent },
          { path: 'body-metrics/progress', component: SidebarComponent },
          { path: 'exercises', component: SidebarComponent },
          { path: 'workout-planning', component: SidebarComponent },
          { path: 'workout-planning/:id', component: SidebarComponent },
          { path: 'workout-sessions', component: SidebarComponent },
          { path: 'workout-sessions/:id', component: SidebarComponent },
        ]),
      ],
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

  it('recovers the current session and stays active on its detail route', async () => {
    const link = fixture.nativeElement.querySelector(
      'a[href="/workout-sessions"]',
    ) as HTMLAnchorElement;
    expect(link.textContent).toContain('Sessão de treino');
    link.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/workout-sessions');
    await TestBed.inject(Router).navigateByUrl('/workout-sessions/100');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(link.classList.contains('ic-sidebar__link--active')).toBe(true);
    expect(link.getAttribute('aria-current')).toBe('page');
  });

  it('opens the exercise catalog from the sidebar and highlights its link', async () => {
    const link = fixture.nativeElement.querySelector('a[href="/exercises"]') as HTMLAnchorElement;
    expect(link.textContent).toContain('Catálogo de exercícios');
    link.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/exercises');
    expect(link.classList.contains('ic-sidebar__link--active')).toBe(true);
  });

  it('should render the profile navigation link', () => {
    const link = fixture.nativeElement.querySelector('a[href="/profile"]') as HTMLAnchorElement;

    expect(link.textContent).toContain('Perfil');
    expect(link.getAttribute('href')).toBe('/profile');
  });

  it('opens Workout Planning and keeps its link active on the detail route', async () => {
    const link = fixture.nativeElement.querySelector(
      'a[href="/workout-planning"]',
    ) as HTMLAnchorElement;
    expect(link.textContent).toContain('Planejamento de treinos');
    link.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/workout-planning');
    await TestBed.inject(Router).navigateByUrl('/workout-planning/9');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(link.classList.contains('ic-sidebar__link--active')).toBe(true);
    expect(link.getAttribute('aria-current')).toBe('page');
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

  it('opens evolution, highlights only its link and expands the body metrics group', async () => {
    const link = fixture.nativeElement.querySelector(
      'a[href="/body-metrics/progress"]',
    ) as HTMLAnchorElement;
    expect(link.textContent).toContain('Evolução');
    link.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/body-metrics/progress');
    expect(link.classList.contains('ic-sidebar__link--active')).toBe(true);
    expect(
      fixture.nativeElement
        .querySelector('a[href="/body-metrics"]')
        .classList.contains('ic-sidebar__link--active'),
    ).toBe(false);
    expect(
      fixture.debugElement.query(By.directive(MatExpansionPanel)).componentInstance.expanded,
    ).toBe(true);
  });
});
