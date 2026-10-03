import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BodyMetricsDetailComponent } from './body-metrics-detail.component';

describe('BodyMetricsDetailComponent', () => {
  let component: BodyMetricsDetailComponent;
  let fixture: ComponentFixture<BodyMetricsDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BodyMetricsDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BodyMetricsDetailComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
