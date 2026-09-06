import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';

import { DialogComponent } from './dialog.component';
import { DialogData } from './dialog.models';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private readonly dialog = inject(MatDialog);

  open(data: DialogData): Observable<boolean | undefined> {
    return this.dialog
      .open<DialogComponent, DialogData, boolean>(DialogComponent, {
        data,
      })
      .afterClosed();
  }
}
