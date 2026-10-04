import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BodyMetricsLatestComponent } from './body-metrics-latest.component';

describe('BodyMetricsLatestComponent', () => {
  let component: BodyMetricsLatestComponent;
  let fixture: ComponentFixture<BodyMetricsLatestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BodyMetricsLatestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BodyMetricsLatestComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
