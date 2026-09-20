import { DOCUMENT, inject, Injectable, signal } from '@angular/core';

import { Theme } from './theme.models';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'Ironcore-theme';
  private readonly currentThemeState = signal<Theme>('dark');

  readonly currentTheme = this.currentThemeState.asReadonly();

  constructor() {
    const savedTheme = this.document.defaultView?.localStorage.getItem(this.storageKey);
    const initialTheme: Theme = savedTheme === 'light' ? 'light' : 'dark';

    this.applyTheme(initialTheme);
  }

  setTheme(theme: Theme): void {
    this.applyTheme(theme);
    this.document.defaultView?.localStorage.setItem(this.storageKey, theme);
  }

  private applyTheme(theme: Theme): void {
    this.document.documentElement.dataset['theme'] = theme;
    this.currentThemeState.set(theme);
  }
}
