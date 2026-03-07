// settings.component.ts
import { Component } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { AuthService } from "../../services/auth.service";
import {
  DefaultAccent,
  DefaultAccentName,
  DefaultMode,
  DefaultModeName,
  Theme,
  ThemeName,
  ThemeService
} from "../../services/theme.service";
import { ActivatedRoute } from "@angular/router";
import {
  UserApiService,
  TeamSummaryUser
} from "../../services/user.service";
import { ProjectApiService } from "../../services/project-api.service";
import { DialogService } from "../../services/dialog.service";
import {
  AVAILABLE_ROLES,
  US_STATES,
} from "../../shared/constants/admin.constants";

interface Project {
  uuid: string;
  projectFullName: string;
  projectName: string;
  status: string;
  startDate: string;
  contract: string;
  description: string;
  pointOfContact: string;
  productManager: string;
  productOwner: string;
}

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  user: any;
  profileUserId: string | null = null;
  profileData: any | null = null;

  themes: readonly Theme[] = [];
  defaultAccents: readonly DefaultAccent[] = [];
  defaultModes: readonly DefaultMode[] = [];

  isEditingProfile = false;
  profileEditForm: FormGroup;

  availableRoles = AVAILABLE_ROLES;
  availableStates = US_STATES;

  users: TeamSummaryUser[] = [];
  projects: Project[] = [];

  constructor(
    private authService: AuthService,
    public themeService: ThemeService,
    private route: ActivatedRoute,
    private userApiService: UserApiService,
    private projectApiService: ProjectApiService,
    private dialogService: DialogService,
    private formBuilder: FormBuilder
  ) {
    this.themes = this.themeService.getThemes();
    this.defaultAccents = this.themeService.getDefaultAccentNames();
    this.defaultModes = this.themeService.getDefaultModes();
    this.profileEditForm = this.createProfileEditForm();
  }


  ngOnInit() {
    this.route.paramMap.subscribe(async params => {
      this.dialogService.openSpinner();
      try {
        const user = await this.authService.getUser();
        this.user = user;
        this.profileUserId = params.get('userId');

        const [users, projects] = await Promise.all([
          this.userApiService.getUsers() as Promise<TeamSummaryUser[]>,
          firstValueFrom(this.projectApiService.getProjects()) as unknown as Promise<Project[]>,
        ]);

        this.users = users;
        this.projects = projects;

        if (this.profileUserId && this.profileUserId !== user?.uuid) {
          const profileData = await this.userApiService.getUserInfo(this.profileUserId);
          console.log('Loaded profile data for userId', this.profileUserId, ':', profileData);
          this.profileData = profileData;
        } else {
          this.profileData = user;
          this.profileUserId = user?.uuid ?? null;
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        this.dialogService.standardError(error, 'Load Profile', 'loading the profile');
      } finally {
        this.dialogService.closeSpinner();
      }
    });
  }

  private createProfileEditForm(): FormGroup {
    return this.formBuilder.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      state: ['', Validators.required],
      startDate: ['', Validators.required],
      roles: [[]],
      assignments: [[]],
      pmTeams: [[]],
      supervisorId: [null],
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

  isCurrentUser(): boolean {
    return this.user?.uuid === this.profileUserId;
  }

  currentUserIsAdmin(): boolean {
    return !!this.user?.roles?.includes('ADMIN');
  }

  canEditProfile(): boolean {
    return this.currentUserIsAdmin();
  }

  get potentialSupervisors(): TeamSummaryUser[] {
    return this.users.filter(
      (u) => u.roles.includes('LEAD') || u.roles.includes('PM')
    );
  }

  startProfileEdit(): void {
    if (!this.profileData || !this.canEditProfile()) return;

    const startDate = this.parseStartDate(this.profileData.startDate, this.profileData.startYear);

    this.profileEditForm.reset({
      name: this.profileData.name || '',
      email: this.profileData.email || '',
      state: this.profileData.state || '',
      startDate,
      roles: this.profileData.roles || [],
      assignments: this.profileData.assignments || [],
      pmTeams: this.profileData.pmTeams || [],
      supervisorId: this.profileData.supervisorId ?? null,
    });

    if (this.currentUserIsAdmin()) {
      this.profileEditForm.get('roles')?.enable({ emitEvent: false });
      this.profileEditForm.get('assignments')?.enable({ emitEvent: false });
      this.profileEditForm.get('pmTeams')?.enable({ emitEvent: false });
      this.profileEditForm.get('supervisorId')?.enable({ emitEvent: false });
    } else {
      this.profileEditForm.get('roles')?.disable({ emitEvent: false });
      this.profileEditForm.get('assignments')?.disable({ emitEvent: false });
      this.profileEditForm.get('pmTeams')?.disable({ emitEvent: false });
      this.profileEditForm.get('supervisorId')?.disable({ emitEvent: false });
    }

    this.isEditingProfile = true;
  }

  cancelProfileEdit(): void {
    this.isEditingProfile = false;
    this.profileEditForm.reset();
  }

  async saveProfileEdit(): Promise<void> {
    if (!this.profileEditForm.valid || !this.profileData || !this.canEditProfile()) return;

    const formValue = this.profileEditForm.getRawValue();
    const selectedDate = new Date(formValue.startDate);
    const newStartDate = `${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${String(selectedDate.getDate()).padStart(2, '0')}`;
    const newStartYear = selectedDate.getFullYear().toString();

    const updatePayload: any = {
      name: formValue.name,
      firstName: formValue.name.split(' ')[0] || '',
      lastName: formValue.name.split(' ').slice(1).join(' '),
      email: formValue.email,
      state: formValue.state,
      startDate: newStartDate,
      startYear: newStartYear,
    };

    if (this.currentUserIsAdmin()) {
      updatePayload.roles = formValue.roles;
      updatePayload.assignments = formValue.assignments;
      updatePayload.pmTeams = formValue.pmTeams;
      updatePayload.supervisorId = formValue.supervisorId ?? undefined;
    }

    try {
      this.dialogService.openSpinner();

      await this.userApiService.updateUser(this.profileData.uuid, updatePayload);

      this.profileData = {
        ...this.profileData,
        ...updatePayload,
      };

      if (this.isCurrentUser()) {
        this.user = {
          ...this.user,
          ...updatePayload,
        };
      }

      this.dialogService.saveSuccessOpen({
        panelClass: 'confirmation-modal',
        width: '600px',
        data: {
          title: 'Profile Updated',
          text: 'Profile updated successfully'
        }
      });

      this.cancelProfileEdit();
    } catch (error) {
      console.error('Failed to update profile', error);
      this.dialogService.standardError(error, 'Update Profile', 'updating the profile');
    } finally {
      this.dialogService.closeSpinner();
    }
  }

  private parseStartDate(startDate: string, startYear: string): Date {
    if (!startDate || !startYear) return new Date();
    const [month, day] = startDate.split('/');
    return new Date(parseInt(startYear, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  }

  getProjectStatusLabel(status: string): string {
    return status === 'Active' ? 'Active' : 'Inactive';
  }

  getSupervisorName(supervisorId: string | null | undefined): string {
    if (!supervisorId) return '—';
    const supervisor = this.users.find((u) => u.uuid === supervisorId);
    if (!supervisor) return '—';
    return `${supervisor.name} (${supervisor.roles.join(', ')})`;
  }

  getProjectNames(assignmentIds: string[] | null | undefined): string {
    if (!assignmentIds?.length) return '—';

    const names = assignmentIds
      .map((id) => {
        const project = this.projects.find((p) => p.uuid === id);
        return project ? `${project.projectName} - ${this.getProjectStatusLabel(project.status)}` : null;
      })
      .filter(Boolean);

    return names.length ? names.join(', ') : '—';
  }

  getPmTeamNames(pmTeams: string[] | null | undefined): string {
    if (!pmTeams?.length) return '—';
    return pmTeams.join(', ');
  }

  getUserFirstLast(user: any): string {
    console.log('Getting name for user:', user);
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'Unknown User';
  }
}