import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { DialogComponent } from './dialog.component';
import { DialogData } from './dialog.models';
import { DialogService } from './dialog.service';

describe('DialogService', () => {
  let service: DialogService;

  const afterClosedMock = vi.fn();

  const dialogMock = {
    open: vi.fn(),
  };

  beforeEach(() => {
    afterClosedMock.mockReturnValue(of(true));

    dialogMock.open.mockReturnValue({
      afterClosed: afterClosedMock,
    });

    TestBed.configureTestingModule({
      providers: [
        DialogService,
        {
          provide: MatDialog,
          useValue: dialogMock,
        },
      ],
    });

    service = TestBed.inject(DialogService);

    dialogMock.open.mockClear();
    afterClosedMock.mockClear();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should open dialog with provided data', () => {
    const data: DialogData = {
      title: 'Confirmar exclusão',
      message: 'Deseja realmente excluir este treino?',
      primaryAction: 'Confirmar',
      secondaryAction: 'Cancelar',
    };

    service.open(data);

    expect(dialogMock.open).toHaveBeenCalledWith(DialogComponent, {
      data,
      width: '600px',
      maxWidth: 'calc(100vw - 1.5rem)',
    });
  });

  it('should return dialog result after close', () => {
    const data: DialogData = {
      title: 'Informação',
      message: 'Operação concluída.',
      primaryAction: 'Ok',
    };

    const result$ = service.open(data);

    expect(result$).toBeDefined();
    expect(afterClosedMock).toHaveBeenCalled();
  });
});
