import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { DialogComponent } from './dialog.component';
import { DialogData } from './dialog.models';

describe('DialogComponent', () => {
  let component: DialogComponent;
  let fixture: ComponentFixture<DialogComponent>;

  const dialogData: DialogData = {
    title: 'Confirmar exclusão',
    message: 'Deseja realmente excluir este treino?',
    primaryAction: 'Confirmar',
    secondaryAction: 'Cancelar',
  };

  const dialogRefMock = {
    close: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogComponent],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: dialogData,
        },
        {
          provide: MatDialogRef,
          useValue: dialogRefMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  beforeEach(() => {
    dialogRefMock.close.mockClear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title and message', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h2')?.textContent?.trim()).toBe(dialogData.title);

    expect(element.querySelector('p')?.textContent?.trim()).toBe(dialogData.message);
  });

  it('should display primary and secondary actions', () => {
    const buttons = fixture.nativeElement.querySelectorAll('app-button');

    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent.trim()).toBe(dialogData.secondaryAction);
    expect(buttons[1].textContent.trim()).toBe(dialogData.primaryAction);
  });

  it('should close dialog with true when confirmed', () => {
    component.confirm();

    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('should close dialog with false when cancelled', () => {
    component.cancel();

    expect(dialogRefMock.close).toHaveBeenCalledWith(false);
  });
});
