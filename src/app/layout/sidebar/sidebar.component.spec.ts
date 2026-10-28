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
          { path: 'workout-sessions/history', component: SidebarComponent },
          { path: 'workout-sessions/progress', component: SidebarComponent },
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

  function group(name: string) {
    return fixture.debugElement.queryAll(By.directive(MatExpansionPanel)).find((panel) =>
      panel.nativeElement.querySelector('mat-panel-title').textContent.includes(name),
    )!;
  }

  it('groups the existing destinations with their labels, icons and shared child-link structure', () => {
    const expectedGroups = [
      {
        name: 'Medidas corporais', icon: 'accessibility_new', links: [
          ['/body-metrics', 'Histórico', 'history'],
          ['/body-metrics/progress', 'Evolução', 'show_chart'],
        ],
      },
      {
        name: 'Treinos', icon: 'calendar_month', links: [
          ['/workout-planning', 'Planejamento de treinos', 'event_note'],
          ['/workout-sessions', 'Sessão de treino em andamento', 'play_circle'],
          ['/workout-sessions/history', 'Histórico de sessões', 'history'],
          ['/workout-sessions/progress', 'Evolução de treinos', 'show_chart'],
        ],
      },
    ];
    expect(fixture.debugElement.queryAll(By.directive(MatExpansionPanel))).toHaveLength(2);
    for (const expected of expectedGroups) {
      const panel = group(expected.name).nativeElement as HTMLElement;
      const title = panel.querySelector('mat-panel-title')!;
      expect(title.querySelector('mat-icon')!.textContent!.trim()).toBe(expected.icon);
      expect(title.querySelector('.ic-sidebar__link-content > span')!.textContent).toBe(expected.name);
      const links = Array.from(panel.querySelectorAll<HTMLAnchorElement>('a'));
      expect(links.map((link) => [
        link.getAttribute('href'),
        link.querySelector('.ic-sidebar__link-content > span')!.textContent!.trim(),
        link.querySelector('.ic-sidebar__link-content > mat-icon')!.textContent!.trim(),
      ])).toEqual(expected.links);
      expect(links.every((link) => link.classList.contains('ic-sidebar__link--child'))).toBe(true);
    }
    for (const href of ['/profile', '/exercises']) {
      const link = fixture.nativeElement.querySelector(`a[href="${href}"]`) as HTMLAnchorElement;
      expect(link.closest('mat-expansion-panel')).toBeNull();
    }
  });

  it.each([
    ['/workout-planning', '/workout-planning'],
    ['/workout-planning/9', '/workout-planning'],
    ['/workout-sessions', '/workout-sessions'],
    ['/workout-sessions/100', '/workout-sessions'],
    ['/workout-sessions/history', '/workout-sessions/history'],
    ['/workout-sessions/100?from=history', '/workout-sessions/history'],
    ['/workout-sessions/progress', '/workout-sessions/progress'],
    ['/workout-sessions/100?from=progress', '/workout-sessions/progress'],
  ])('expands Treinos on %s and marks only %s as the current page', async (url, href) => {
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    fixture.detectChanges();
    expect((group('Treinos').componentInstance as MatExpansionPanel).expanded).toBe(true);
    expect((group('Medidas corporais').componentInstance as MatExpansionPanel).expanded).toBe(false);
    const active = fixture.nativeElement.querySelectorAll('a.ic-sidebar__link--active') as NodeListOf<HTMLAnchorElement>;
    expect(active).toHaveLength(1);
    expect(active[0].getAttribute('href')).toBe(href);
    expect(active[0].getAttribute('aria-current')).toBe('page');
    const current = fixture.nativeElement.querySelectorAll('a[aria-current="page"]') as NodeListOf<HTMLAnchorElement>;
    expect(current).toHaveLength(1);
    expect(current[0]).toBe(active[0]);
  });

  it.each([
    ['/body-metrics', 'Medidas corporais'],
    ['/body-metrics/progress', 'Medidas corporais'],
    ['/workout-sessions/100?from=progress', 'Treinos'],
  ])('preserves manual collapse and expansion of the active group on %s', async (url, name) => {
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    fixture.detectChanges();
    const panel = group(name);
    const instance = panel.componentInstance as MatExpansionPanel;
    const header = panel.nativeElement.querySelector('mat-expansion-panel-header') as HTMLElement;
    expect(instance.expanded).toBe(true);
    header.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(instance.expanded).toBe(false);
    expect(header.getAttribute('aria-expanded')).toBe('false');
    header.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(instance.expanded).toBe(true);
    expect(header.getAttribute('aria-expanded')).toBe('true');
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

  it('opens history without highlighting the current-session entry', async () => {
    const link = fixture.nativeElement.querySelector('a[href="/workout-sessions/history"]') as HTMLAnchorElement;
    expect(link.textContent).toContain('Histórico de sessões');
    link.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/workout-sessions/history');
    expect(link.classList.contains('ic-sidebar__link--active')).toBe(true);
    expect(fixture.nativeElement.querySelector('a[href="/workout-sessions"]').classList.contains('ic-sidebar__link--active')).toBe(false);
    await TestBed.inject(Router).navigateByUrl('/workout-sessions/100?from=history');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(link.classList.contains('ic-sidebar__link--active')).toBe(true);
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(fixture.nativeElement.querySelector('a[href="/workout-sessions"]').classList.contains('ic-sidebar__link--active')).toBe(false);
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
