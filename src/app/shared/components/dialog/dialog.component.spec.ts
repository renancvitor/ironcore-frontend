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

  it('renders untrusted backend messages as text', () => {
    const previous = dialogData.message;
    const payload = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
    dialogData.message = payload;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p').textContent).toContain(payload);
    expect(fixture.nativeElement.querySelector('img, script')).toBeNull();
    dialogData.message = previous;
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
