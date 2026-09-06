import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('icon', 'fitness_center');
    fixture.componentRef.setInput('message', 'Nenhum treino encontrado.');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the provided icon', () => {
    const icon = fixture.nativeElement.querySelector('mat-icon');

    expect(icon.textContent.trim()).toBe('fitness_center');
  });

  it('should display the provided message', () => {
    const message = fixture.nativeElement.querySelector('.ic-empty-state__message');

    expect(message.textContent.trim()).toBe('Nenhum treino encontrado.');
  });
});
