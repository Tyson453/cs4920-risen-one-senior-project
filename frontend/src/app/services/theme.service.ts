import { Injectable } from '@angular/core';

export const THEMES = [
  { id: 'default', name: 'Default', defaultMode: 'dark' as DefaultModeName},
  { id: 'iridescent', name: 'Iridescent', defaultMode: 'dark' as DefaultModeName},
  { id: 'ultraviolet', name: 'Ultraviolet', defaultMode: 'dark' as DefaultModeName},
  { id: 'coral', name: 'Coral', defaultMode: 'dark' as DefaultModeName},
  { id: 'samurai', name: 'Samurai', defaultMode: 'dark' as DefaultModeName},
  { id: 'strawberrymilk', name: 'Strawberry Milk', defaultMode: 'light' as DefaultModeName},
  { id: 'peachtea', name: 'Peach Tea', defaultMode: 'light' as DefaultModeName},
  { id: 'ash', name: 'Ash', defaultMode: 'dark' as DefaultModeName},
];

export type ThemeName = typeof THEMES[number]['id'];
export type Theme = typeof THEMES[number];

export const DEFAULT_ACCENTS = [
  { id: 'default', name: 'Default'},
  { id: 'purple', name: 'Purple' },
  { id: 'pink', name: 'Pink' },
  { id: 'lime', name: 'Lime' },
  { id: 'orange', name: 'Orange' },
  { id: 'green', name: 'Green' },
  { id: 'blue', name: 'Blue' },
] as const;

export type DefaultAccentName = typeof DEFAULT_ACCENTS[number]['id'];
export type DefaultAccent = typeof DEFAULT_ACCENTS[number];

export const DEFAULT_MODES = [
  { id: 'dark', name: 'Dark' },
  { id: 'light', name: 'Light' },
] as const;

export type DefaultModeName = typeof DEFAULT_MODES[number]['id'];
export type DefaultMode = typeof DEFAULT_MODES[number];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'theme';
  private readonly ATTR_NAME = 'theme';
  private readonly DEFAULT_THEME: ThemeName = 'default';

  private readonly ACCENT_STORAGE_KEY = 'default_accent';
  private readonly ACCENT_ATTR_NAME = 'default-accent';
  private readonly DEFAULT_ACCENT: DefaultAccentName = 'default';

  private readonly MODE_STORAGE_KEY = 'default_mode';
  private readonly MODE_ATTR_NAME = 'default-mode';
  private readonly DEFAULT_MODE: DefaultModeName = 'dark';

  /** Optional: expose for UI dropdowns */
  getThemeNames(): readonly ThemeName[] {
    return THEMES.map(theme => theme.id);
  }

  getThemes(): readonly Theme[] {
    return THEMES;
  }

  getDefaultAccentNames() {
    return DEFAULT_ACCENTS;
  }

  getDefaultAccentName(): DefaultAccentName {
    const attr = document.documentElement.getAttribute(this.ACCENT_ATTR_NAME);
    return this.isAccent(attr) ? attr : this.DEFAULT_ACCENT;
  }

  setDefaultAccentName(accent: DefaultAccentName): void {
    this.applyDefaultAccentName(accent);
  }

  getDefaultModes() {
    return DEFAULT_MODES;
  }

  getDefaultMode(): DefaultModeName {
    const attr = document.documentElement.getAttribute(this.MODE_ATTR_NAME);
    return this.isMode(attr) ? attr : this.DEFAULT_MODE;
  }

  setDefaultMode(mode: DefaultModeName) {
    this.applyDefaultMode(mode);
  }

  initTheme(): void {
    const saved = this.readSavedTheme();
    this.applyTheme(saved ?? this.DEFAULT_THEME, this.getDefaultMode());

    const savedAccent = this.readSavedAccent();
    this.applyDefaultAccentName(savedAccent ?? this.DEFAULT_ACCENT);

    const savedMode = this.readSavedMode();
    this.applyDefaultMode(savedMode ?? this.DEFAULT_MODE);
  }

  setTheme(theme: ThemeName, defaultMode: DefaultModeName): void {
    this.applyTheme(theme, defaultMode);
  }

  getCurrentTheme(): ThemeName {
    const attr = document.documentElement.getAttribute(this.ATTR_NAME);
    return this.isTheme(attr) ? attr : this.DEFAULT_THEME;
  }

  private readSavedTheme(): ThemeName | null {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return this.isTheme(saved) ? saved : null;
  }

  private isTheme(value: unknown): value is ThemeName {
    return typeof value === 'string' && THEMES.some(theme => theme.id === value);
  }

  private applyTheme(theme: ThemeName, defaultMode: DefaultModeName): void {
    const root = document.documentElement;
    if (theme === this.DEFAULT_THEME) {
      root.removeAttribute(this.ATTR_NAME);
      localStorage.removeItem(this.STORAGE_KEY);
      this.applyDefaultMode(defaultMode);
      return;
    }

    root.setAttribute(this.ATTR_NAME, theme);
    this.applyDefaultMode(defaultMode);
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  private readSavedAccent(): DefaultAccentName | null {
    const saved = localStorage.getItem(this.ACCENT_STORAGE_KEY);
    return this.isAccent(saved) ? saved : null;
  }

  private isAccent(value: unknown): value is DefaultAccentName {
    return typeof value === 'string' && DEFAULT_ACCENTS.some(a => a.id === value);
  }

  private applyDefaultAccentName(accent: DefaultAccentName): void {
    const root = document.documentElement;
    root.setAttribute(this.ACCENT_ATTR_NAME, accent);
    localStorage.setItem(this.ACCENT_STORAGE_KEY, accent);
  }

  private readSavedMode(): DefaultModeName | null {
    const saved = localStorage.getItem(this.MODE_STORAGE_KEY);
    return this.isMode(saved) ? saved : null;
  }

  private isMode(value: unknown): value is DefaultModeName {
    return typeof value === 'string' && DEFAULT_MODES.some(m => m.id === value);
  }

  private applyDefaultMode(mode: DefaultModeName) {
    const root = document.documentElement;
    root.setAttribute(this.MODE_ATTR_NAME, mode);
    localStorage.setItem(this.MODE_STORAGE_KEY, mode);
  }
}