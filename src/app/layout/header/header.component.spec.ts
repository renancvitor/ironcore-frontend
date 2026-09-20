import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
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
});
