import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { ThemePreference } from '../../core/theme/theme.models';
import { DialogService } from '../../shared/components/dialog/dialog.service';

@Component({
  selector: 'app-header',
  imports: [MatButtonModule, MatIconModule, RouterLink, MatTooltipModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly dialogService = inject(DialogService);

  readonly menuToggle = output<void>();
  private readonly nextPreference = computed<ThemePreference>(() => {
    const next: Record<ThemePreference, ThemePreference> = {
      system: 'light',
      light: 'dark',
      dark: 'system',
    };
    return next[this.themeService.preference()];
  });
  readonly themeIcon = computed(() => {
    const icons = { system: 'computer', light: 'light_mode', dark: 'dark_mode' };
    return icons[this.themeService.preference()];
  });
  readonly themeLabel = computed(() => {
    const labels = { system: 'sistema', light: 'claro', dark: 'escuro' };
    const preference = this.themeService.preference();
    const current =
      preference === 'system'
        ? `sistema (${labels[this.themeService.currentTheme()]})`
        : labels[preference];
    return `Tema: ${current}. Alterar para ${labels[this.nextPreference()]}`;
  });

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

  changeTheme(): void {
    this.themeService.setPreference(this.nextPreference());
  }
}
