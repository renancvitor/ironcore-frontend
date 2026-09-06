import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ToastComponent } from './toast.component';
import { ToastData, ToastType } from './toast.models';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string, duration?: number): void {
    this.open('success', message, duration);
  }

  error(message: string, duration?: number): void {
    this.open('error', message, duration);
  }

  warning(message: string, duration?: number): void {
    this.open('warning', message, duration);
  }

  info(message: string, duration?: number): void {
    this.open('info', message, duration);
  }

  private open(type: ToastType, message: string, duration = 4000): void {
    const data: ToastData = {
      type,
      message,
    };

    this.snackBar.openFromComponent(ToastComponent, {
      data,
      duration,
    });
  }
}
