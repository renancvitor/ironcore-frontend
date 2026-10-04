import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let document: Document;
  let media: MediaQueryList;
  let dark: boolean;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    document = TestBed.inject(DOCUMENT);
    localStorage.clear();
    dark = false;
    const events = new EventTarget();
    media = {
      get matches() {
        return dark;
      },
      addEventListener: vi.fn(events.addEventListener.bind(events)),
      removeEventListener: vi.fn(events.removeEventListener.bind(events)),
      dispatchEvent: events.dispatchEvent.bind(events),
    } as unknown as MediaQueryList;
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => media),
    );
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });

  function changeSystem(isDark: boolean) {
    dark = isDark;
    media.dispatchEvent(new Event('change'));
  }

  it.each([false, true])('should default to system (dark: %s)', (isDark) => {
    dark = isDark;
    const service = TestBed.inject(ThemeService);
    expect(service.preference()).toBe('system');
    expect(service.currentTheme()).toBe(isDark ? 'dark' : 'light');
    expect(document.documentElement.dataset['theme']).toBe(service.currentTheme());
    expect(localStorage.getItem('Ironcore-theme')).toBeNull();
  });

  it.each(['light', 'dark'] as const)('should restore an existing %s choice', (theme) => {
    localStorage.setItem('Ironcore-theme', theme);
    const service = TestBed.inject(ThemeService);
    changeSystem(theme !== 'dark');
    expect(service.preference()).toBe(theme);
    expect(service.currentTheme()).toBe(theme);
    expect(document.documentElement.dataset['theme']).toBe(theme);
  });

  it.each(['system', 'invalid'])('should follow the system for stored value %s', (value) => {
    localStorage.setItem('Ironcore-theme', value);
    const service = TestBed.inject(ThemeService);
    expect(service.preference()).toBe('system');
    changeSystem(true);
    expect(service.currentTheme()).toBe('dark');
    changeSystem(false);
    expect(service.currentTheme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('should persist manual choices and resume automatic updates when system is selected', () => {
    const service = TestBed.inject(ThemeService);
    service.setPreference('dark');
    changeSystem(false);
    expect(service.currentTheme()).toBe('dark');
    expect(localStorage.getItem('Ironcore-theme')).toBe('dark');
    service.setPreference('system');
    expect(service.currentTheme()).toBe('light');
    expect(localStorage.getItem('Ironcore-theme')).toBe('system');
    changeSystem(true);
    expect(service.currentTheme()).toBe('dark');
    expect(localStorage.getItem('Ironcore-theme')).toBe('system');
  });

  it('should keep working when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const service = TestBed.inject(ThemeService);
    expect(service.currentTheme()).toBe('light');
    expect(() => service.setPreference('dark')).not.toThrow();
    expect(service.currentTheme()).toBe('dark');
  });

  it('should fall back to dark when system detection is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    const service = TestBed.inject(ThemeService);
    expect(service.preference()).toBe('system');
    expect(service.currentTheme()).toBe('dark');
  });

  it('should remove the system listener on destruction', () => {
    TestBed.inject(ThemeService);
    const listener = vi.mocked(media.addEventListener).mock.calls[0][1];
    TestBed.resetTestingModule();
    expect(media.removeEventListener).toHaveBeenCalledWith('change', listener);
  });
});
