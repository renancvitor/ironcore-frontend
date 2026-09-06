import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

import { ToastComponent } from './toast.component';
import { ToastData } from './toast.models';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;

  const toastData: ToastData = {
    type: 'success',
    message: 'Operação realizada com sucesso.',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [
        {
          provide: MAT_SNACK_BAR_DATA,
          useValue: toastData,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the provided message', () => {
    const message = fixture.nativeElement.querySelector('.ic-toast__message') as HTMLElement;

    expect(message.textContent?.trim()).toBe(toastData.message);
  });

  it('should apply the class for the provided type', () => {
    const toast = fixture.nativeElement.querySelector('.ic-toast') as HTMLElement;

    expect(toast.classList.contains('ic-toast--success')).toBe(true);
  });

  it('should display the icon for the provided type', () => {
    const icon = fixture.nativeElement.querySelector('.ic-toast__icon') as HTMLElement;

    expect(icon.textContent?.trim()).toBe('check_circle');
  });
});
