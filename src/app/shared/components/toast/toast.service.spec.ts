import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ToastComponent } from './toast.component';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  const snackBarMock = {
    openFromComponent: vi.fn(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ToastService,
        {
          provide: MatSnackBar,
          useValue: snackBarMock,
        },
      ],
    });

    service = TestBed.inject(ToastService);

    snackBarMock.openFromComponent.mockClear();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should open success toast', () => {
    service.success('Operação concluída.');

    expect(snackBarMock.openFromComponent).toHaveBeenCalledWith(ToastComponent, {
      data: {
        type: 'success',
        message: 'Operação concluída.',
      },
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: 'ic-toast-panel',
    });
  });

  it('should open error toast', () => {
    service.error('Erro ao processar operação.');

    expect(snackBarMock.openFromComponent).toHaveBeenCalledWith(ToastComponent, {
      data: {
        type: 'error',
        message: 'Erro ao processar operação.',
      },
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: 'ic-toast-panel',
    });
  });

  it('should open warning toast', () => {
    service.warning('Atenção.');

    expect(snackBarMock.openFromComponent).toHaveBeenCalledWith(ToastComponent, {
      data: {
        type: 'warning',
        message: 'Atenção.',
      },
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: 'ic-toast-panel',
    });
  });

  it('should open info toast', () => {
    service.info('Informação.');

    expect(snackBarMock.openFromComponent).toHaveBeenCalledWith(ToastComponent, {
      data: {
        type: 'info',
        message: 'Informação.',
      },
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: 'ic-toast-panel',
    });
  });

  it('should use custom duration', () => {
    service.success('Operação concluída.', 6000);

    expect(snackBarMock.openFromComponent).toHaveBeenCalledWith(ToastComponent, {
      data: {
        type: 'success',
        message: 'Operação concluída.',
      },
      duration: 6000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: 'ic-toast-panel',
    });
  });
});
