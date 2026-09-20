import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { DialogService } from '../../shared/components/dialog/dialog.service';

@Component({
  selector: 'app-header',
  imports: [MatButtonModule, MatIconModule, RouterLink, MatTooltipModule, MatSlideToggleModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly dialogService = inject(DialogService);

  readonly menuToggle = output<void>();
  readonly currentTheme = this.themeService.currentTheme;

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) {
          void this.router.navigate(['/login']);
          return;
        }

        const message = error.error?.message ?? 'Não foi possível encerrar a sessão.';

        this.dialogService.open({
          title: 'Não foi possível sair da conta',
          message,
          primaryAction: 'Ok',
        });
      },
    });
  }

  changeTheme(checked: boolean): void {
    this.themeService.setTheme(checked ? 'dark' : 'light');
  }
}
