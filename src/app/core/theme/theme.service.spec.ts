import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let document: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    document = TestBed.inject(DOCUMENT);
    document.defaultView?.localStorage.clear();
    delete document.documentElement.dataset['theme'];
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    document.defaultView?.localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should apply the dark theme when no preference was saved', () => {
    expect(service.currentTheme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('should restore the saved light theme', () => {
    document.defaultView?.localStorage.setItem('Ironcore-theme', 'light');
    service = TestBed.runInInjectionContext(() => new ThemeService());

    expect(service.currentTheme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('should apply and persist a selected theme', () => {
    service.setTheme('light');

    expect(service.currentTheme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(document.defaultView?.localStorage.getItem('Ironcore-theme')).toBe('light');
  });
});
