import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatPaginatorIntl } from '@angular/material/paginator';

import { PaginatorIntlPtBr } from '../../shared/config/paginator-intl-pt-br';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-app-shell',
  imports: [HeaderComponent, SidebarComponent, RouterOutlet],
  providers: [{ provide: MatPaginatorIntl, useClass: PaginatorIntlPtBr }],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  sidebarOpen = false;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
}
