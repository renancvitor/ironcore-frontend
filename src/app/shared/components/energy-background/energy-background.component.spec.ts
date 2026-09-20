import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyBackgroundComponent } from './energy-background.component';

describe('EnergyBackgroundComponent', () => {
  let fixture: ComponentFixture<EnergyBackgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnergyBackgroundComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EnergyBackgroundComponent);
    fixture.detectChanges();
  });

  it('should create a decorative background', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.getAttribute('aria-hidden')).toBe('true');
    expect(fixture.nativeElement.querySelector('svg')).toBeTruthy();
  });
});
