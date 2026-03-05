// settings.component.ts
import { Component } from "@angular/core";
import { AuthService } from "../../services/auth.service";
import { DefaultAccent, DefaultAccentName, DefaultMode, DefaultModeName, Theme, ThemeName, ThemeService } from "../../services/theme.service";

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  user: any;
  themes: readonly Theme[] = [];
  defaultAccents: readonly DefaultAccent[] = [];
  defaultModes: readonly DefaultMode[] = [];

  constructor(
    private authService: AuthService,
    public themeService: ThemeService
  ) {
    this.themes = this.themeService.getThemes();
    this.defaultAccents = this.themeService.getDefaultAccentNames();
    this.defaultModes = this.themeService.getDefaultModes();
  }

  ngOnInit() {
    this.authService.getUser().then((user: any) => {
      this.user = user;
    });
  }

  trackByThemeId(_index: number, theme: Theme): ThemeName {
    return theme.id;
  }

  get currentTheme(): ThemeName {
    return this.themeService.getCurrentTheme();
  }

  setTheme(theme: ThemeName, defaultMode: DefaultModeName) {
    this.themeService.setTheme(theme, defaultMode);
  }

  get currentDefaultAccent(): DefaultAccentName {
    return this.themeService.getDefaultAccentName();
  }

  setDefaultAccent(accent: DefaultAccentName) {
    this.themeService.setDefaultAccentName(accent);
  }

  get currentDefaultMode() {
    return this.themeService.getDefaultMode();
  }

  toggleDefaultMode() {
    this.themeService.setDefaultMode(this.currentDefaultMode === 'dark' ? 'light' : 'dark');
  }
}