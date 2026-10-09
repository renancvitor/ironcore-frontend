import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BodyMetricsCreateComponent } from './body-metrics-create.component';

describe('BodyMetricsCreateComponent', () => {
  let component: BodyMetricsCreateComponent;
  let fixture: ComponentFixture<BodyMetricsCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BodyMetricsCreateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BodyMetricsCreateComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
