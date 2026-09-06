import { Component, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

import { ToastData } from './toast.models';

@Component({
  selector: 'app-toast',
  imports: [MatSnackBarModule, MatIconModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  readonly data = inject<ToastData>(MAT_SNACK_BAR_DATA);
}
