import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([])],
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
    const link = fixture.nativeElement.querySelector('.ic-sidebar__link') as HTMLAnchorElement;

    expect(link.textContent?.trim()).toBe('Perfil');
    expect(link.getAttribute('href')).toBe('/profile');
  });
});
