import { DestroyRef, DOCUMENT, inject, Injectable, signal } from '@angular/core';

import { Theme, ThemePreference } from './theme.models';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'Ironcore-theme';
  private readonly systemTheme = this.document.defaultView?.matchMedia?.(
    '(prefers-color-scheme: dark)',
  );
  private readonly preferenceState = signal<ThemePreference>('system');
  private readonly currentThemeState = signal<Theme>('dark');

  readonly preference = this.preferenceState.asReadonly();
  readonly currentTheme = this.currentThemeState.asReadonly();

  constructor() {
    // Mantenha as regras de inicialização alinhadas com o script antecipado em index.html.
    let savedTheme: string | null | undefined;
    try {
      savedTheme = this.document.defaultView?.localStorage.getItem(this.storageKey);
    } catch {
      // O armazenamento pode estar indisponível; o tema continua funcionando nesta sessão.
    }
    this.preferenceState.set(
      savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'system',
    );
    this.applyPreference();

    const onSystemChange = () => {
      if (this.preference() === 'system') this.applyPreference();
    };
    this.systemTheme?.addEventListener('change', onSystemChange);
    inject(DestroyRef).onDestroy(() => {
      this.systemTheme?.removeEventListener('change', onSystemChange);
    });
  }

  setPreference(preference: ThemePreference): void {
    this.preferenceState.set(preference);
    this.applyPreference();
    try {
      this.document.defaultView?.localStorage.setItem(this.storageKey, preference);
    } catch {
      // Mantém a preferência selecionada em memória quando não é possível salvá-la.
    }
  }

  private applyPreference(): void {
    const preference = this.preference();
    const theme: Theme =
      preference === 'system'
        ? this.systemTheme?.matches === false
          ? 'light'
          : 'dark'
        : preference;
    this.document.documentElement.dataset['theme'] = theme;
    this.currentThemeState.set(theme);
  }
}
