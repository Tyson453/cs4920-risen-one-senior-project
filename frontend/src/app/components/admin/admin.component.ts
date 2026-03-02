import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../services/auth.service';
import {
  UserApiService,
  TeamSummaryUser,
  OrgTeamGroup,
  PmTeamGroup,
} from '../../services/user.service';
import { ProjectApiService } from '../../services/project-api.service';
import { DialogService } from '../../services/dialog.service';
import {
  AVAILABLE_ROLES,
  US_STATES,
} from '../../shared/constants/admin.constants';
import { Router } from '@angular/router';

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

interface ManagingTeamState {
  type: 'org' | 'pm';
  name: string | null;
  displayName: string;
  members: TeamSummaryUser[];
}

interface TeamDeleteState {
  type: 'org' | 'pm';
  name: string;
  displayName: string;
  memberCount: number;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  // ── Users ─────────────────────────────────────────────────────────────────
  users: TeamSummaryUser[] = [];
  projects: Project[] = [];
  editingUser: TeamSummaryUser | null = null;
  isCreatingNewUser = false;
  editForm: FormGroup;
  isLoading = true;
  userToDelete: TeamSummaryUser | null = null;
  showDeleteConfirmation = false;

  availableRoles = AVAILABLE_ROLES;
  availableStates = US_STATES;
  displayedColumns: string[] = ['name', 'email', 'state', 'startDate', 'actions'];

  // ── Teams ──────────────────────────────────────────────────────────────────
  orgTeams: OrgTeamGroup[] = [];
  pmTeams: PmTeamGroup[] = [];
  teamColumns: string[] = ['teamName', 'memberCount', 'actions'];
  managedMemberColumns: string[] = ['name', 'email', 'remove'];

  // Create team state
  showCreateTeamForm: 'org' | 'pm' | null = null;
  newTeamNameInput = '';

  // Rename team state
  editingTeam: { type: 'org' | 'pm'; name: string | null } | null = null;
  renameTeamInput = '';

  // Delete team state
  showTeamDeleteConfirm = false;
  teamToDelete: TeamDeleteState | null = null;

  // Manage members state
  managingTeam: ManagingTeamState | null = null;
  addMemberUuid = '';

  constructor(
    private authService: AuthService,
    private userService: UserApiService,
    private projectApiService: ProjectApiService,
    private dialogService: DialogService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.editForm = this.createEditForm();
  }

  ngOnInit(): void {
    this.checkAdminAccess();
    this.loadData();
  }

  private async checkAdminAccess(): Promise<void> {
    const isAdmin = await this.authService.adminCheck();
    if (!isAdmin) {
      this.router.navigate(['/home']);
    }
  }

  get potentialSupervisors(): TeamSummaryUser[] {
    return this.users.filter(
      (u) => u.roles.includes('LEAD') || u.roles.includes('PM')
    );
  }

  private createEditForm(): FormGroup {
    return this.formBuilder.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      state: ['', Validators.required],
      startDate: ['', Validators.required],
      roles: [[], Validators.required],
      assignments: [[]],
      pmTeams: [[]],
      supervisorId: [null],
    });
  }

  private loadData(): void {
    this.isLoading = true;
    Promise.all([
      this.userService.getUsers() as Promise<TeamSummaryUser[]>,
      firstValueFrom(this.projectApiService.getProjects()) as unknown as Promise<Project[]>,
      this.userService.getTeamsForAdmin(),
    ])
      .then(([users, projects, teamData]) => {
        this.users = users as TeamSummaryUser[];
        this.projects = projects as Project[];
        this.orgTeams = teamData.orgTeams;
        this.pmTeams = teamData.pmTeams;
        this.isLoading = false;
      })
      .catch((error) => {
        console.error('Error loading data:', error);
        this.dialogService.standardError(error, 'Load Error', 'Failed to load admin data');
        this.isLoading = false;
      });
  }

  private async loadTeams(): Promise<void> {
    try {
      const teamData = await this.userService.getTeamsForAdmin();
      this.orgTeams = teamData.orgTeams;
      this.pmTeams = teamData.pmTeams;
      // Keep managing panel in sync after a mutation
      if (this.managingTeam) {
        const pool = this.managingTeam.type === 'org' ? this.orgTeams : this.pmTeams;
        const found = pool.find((t) =>
          this.managingTeam!.type === 'org'
            ? (t as OrgTeamGroup).teamName === this.managingTeam!.name
            : (t as PmTeamGroup).teamName === this.managingTeam!.name
        );
        this.managingTeam.members = found ? found.users : [];
      }
    } catch (error) {
      this.dialogService.standardError(error, 'Load Teams', 'loading team data');
    }
  }

  // ── User management ────────────────────────────────────────────────────────

  onEditUser(user: TeamSummaryUser): void {
    this.editingUser = user;
    this.isCreatingNewUser = false;
    const startDate = this.parseStartDate(user.startDate, user.startYear);
    this.editForm.patchValue({
      name: user.name,
      email: user.email,
      state: user.state,
      startDate: startDate,
      roles: user.roles,
      assignments: user.assignments,
      pmTeams: user.pmTeams,
      supervisorId: user.supervisorId ?? null,
    });
  }

  onCreateNewUser(): void {
    this.editingUser = null;
    this.isCreatingNewUser = true;
    this.editForm.reset({
      name: '',
      email: '',
      state: '',
      startDate: new Date(),
      roles: [],
      assignments: [],
      pmTeams: [],
    });
  }

  private parseStartDate(startDate: string, startYear: string): Date {
    if (!startDate || !startYear) return new Date();
    const [month, day] = startDate.split('/');
    return new Date(parseInt(startYear), parseInt(month) - 1, parseInt(day));
  }

  async onSaveEdit(): Promise<void> {
    if (!this.editForm.valid) return;

    const formValue = this.editForm.value;
    const selectedDate = new Date(formValue.startDate);
    const newStartDate = `${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${String(selectedDate.getDate()).padStart(2, '0')}`;
    const newStartYear = selectedDate.getFullYear().toString();

    if (this.isCreatingNewUser) {
      const newUser: TeamSummaryUser = {
        uuid: this.generateUUID(),
        name: formValue.name,
        firstName: formValue.name.split(' ')[0],
        lastName: formValue.name.split(' ').slice(1).join(' '),
        email: formValue.email,
        state: formValue.state,
        startDate: newStartDate,
        startYear: newStartYear,
        roles: formValue.roles,
        assignments: formValue.assignments,
        pmTeams: formValue.pmTeams,
        supervisorId: formValue.supervisorId ?? undefined,
        birthday: '',
        birthdayNoAcknowledge: false,
        maxHours: 120,
        maxSickHours: 40,
        notes: '',
        requestedPTO: {},
      };
      // TODO: Call backend API to create user
      this.users.push(newUser);
      this.dialogService.saveSuccessOpen({ panelClass: 'confirmation-modal', width: '600px', data: { title: 'User Created', text: 'User created successfully' } });
      this.onCancelEdit();
    } else if (this.editingUser) {
      const updatePayload: Partial<TeamSummaryUser> = {
        name: formValue.name,
        firstName: formValue.name.split(' ')[0],
        lastName: formValue.name.split(' ').slice(1).join(' '),
        email: formValue.email,
        state: formValue.state,
        startDate: newStartDate,
        startYear: newStartYear,
        roles: formValue.roles,
        assignments: formValue.assignments,
        pmTeams: formValue.pmTeams,
        supervisorId: formValue.supervisorId ?? undefined,
      };
      try {
        await this.userService.updateUser(this.editingUser.uuid, updatePayload);
        const updatedUser: TeamSummaryUser = { ...this.editingUser, ...updatePayload };
        const index = this.users.findIndex((u) => u.uuid === this.editingUser!.uuid);
        if (index !== -1) this.users[index] = updatedUser;
        this.dialogService.saveSuccessOpen({ panelClass: 'confirmation-modal', width: '600px', data: { title: 'User Updated', text: 'User updated successfully' } });
        this.onCancelEdit();
      } catch (error) {
        this.dialogService.standardError(error, 'Update User', 'updating the user');
      }
    }
  }

  onCancelEdit(): void {
    this.editingUser = null;
    this.isCreatingNewUser = false;
    this.editForm.reset();
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  onDeleteUser(): void {
    if (!this.editingUser) return;
    this.userToDelete = this.editingUser;
    this.showDeleteConfirmation = true;
  }

  async onConfirmDelete(): Promise<void> {
    if (!this.userToDelete) return;
    try {
      await this.userService.deleteUser(this.userToDelete.uuid);
      this.users = this.users.filter((u) => u.uuid !== this.userToDelete!.uuid);
      this.dialogService.saveSuccessOpen({ panelClass: 'confirmation-modal', width: '600px', data: { title: 'User Deleted', text: 'User deleted successfully' } });
      this.onCancelEdit();
      this.showDeleteConfirmation = false;
      this.userToDelete = null;
      await this.loadTeams();
    } catch (error) {
      this.dialogService.standardError(error, 'Delete User', 'deleting the user');
    }
  }

  onCancelDelete(): void {
    this.showDeleteConfirmation = false;
    this.userToDelete = null;
  }

  getProjectStatusLabel(status: string): string {
    return status === 'Active' ? 'Active' : 'Inactive';
  }

  getProjectStatusClass(status: string): string {
    return status === 'Active' ? 'status-active' : 'status-inactive';
  }

  // ── Team management ────────────────────────────────────────────────────────

  // Create team
  onShowCreateTeam(type: 'org' | 'pm'): void {
    this.showCreateTeamForm = type;
    this.newTeamNameInput = '';
    this.editingTeam = null;
  }

  onCancelCreateTeam(): void {
    this.showCreateTeamForm = null;
    this.newTeamNameInput = '';
  }

  async onConfirmCreateTeam(type: 'org' | 'pm'): Promise<void> {
    const name = this.newTeamNameInput.trim();
    if (!name) return;
    try {
      await this.userService.createTeam(type, name);
      this.showCreateTeamForm = null;
      this.newTeamNameInput = '';
      await this.loadTeams();
      this.dialogService.saveSuccessOpen({ panelClass: 'confirmation-modal', width: '400px', data: { title: 'Team Created', text: `"${name}" is ready for members.` } });
    } catch (error: any) {
      if (error?.status === 409) {
        this.dialogService.standardError(error, 'Create Team', `a team named "${name}" already exists`);
      } else {
        this.dialogService.standardError(error, 'Create Team', 'creating the team');
      }
    }
  }

  // Rename team
  onStartRenameTeam(type: 'org' | 'pm', name: string): void {
    this.showCreateTeamForm = null;
    this.editingTeam = { type, name };
    this.renameTeamInput = name;
  }

  onCancelEditTeam(): void {
    this.editingTeam = null;
    this.renameTeamInput = '';
  }

  async onConfirmRenameTeam(): Promise<void> {
    if (!this.editingTeam) return;
    const newName = this.renameTeamInput.trim();
    if (!newName || newName === this.editingTeam.name) {
      this.onCancelEditTeam();
      return;
    }
    try {
      await this.userService.updateTeam(this.editingTeam.type, this.editingTeam.name!, newName);
      this.editingTeam = null;
      this.renameTeamInput = '';
      await this.loadTeams();
    } catch (error: any) {
      if (error?.status === 409) {
        this.dialogService.standardError(error, 'Rename Team', `a team named "${newName}" already exists`);
      } else {
        this.dialogService.standardError(error, 'Rename Team', 'renaming the team');
      }
    }
  }

  // Delete team
  onDeleteTeam(type: 'org' | 'pm', name: string): void {
    const pool = type === 'org' ? this.orgTeams : this.pmTeams;
    const team = pool.find((t) =>
      type === 'org'
        ? (t as OrgTeamGroup).teamName === name
        : (t as PmTeamGroup).teamName === name
    );
    this.teamToDelete = {
      type,
      name,
      displayName: name,
      memberCount: team ? team.users.length : 0,
    };
    this.showTeamDeleteConfirm = true;
  }

  onCancelTeamDelete(): void {
    this.showTeamDeleteConfirm = false;
    this.teamToDelete = null;
  }

  async onConfirmTeamDelete(): Promise<void> {
    if (!this.teamToDelete) return;
    const { type, name, displayName } = this.teamToDelete;
    try {
      await this.userService.deleteTeam(type, name);
      this.showTeamDeleteConfirm = false;
      this.teamToDelete = null;
      await this.loadTeams();
      this.dialogService.saveSuccessOpen({ panelClass: 'confirmation-modal', width: '400px', data: { title: 'Team Deleted', text: `"${displayName}" has been removed.` } });
    } catch (error) {
      this.dialogService.standardError(error, 'Delete Team', 'deleting the team');
    }
  }

  // Manage members
  onManageMembers(type: 'org' | 'pm', name: string | null, members: TeamSummaryUser[]): void {
    this.addMemberUuid = '';
    this.managingTeam = {
      type,
      name,
      displayName: name ?? 'Unassigned',
      members: [...members],
    };
  }

  onCloseManageMembers(): void {
    this.managingTeam = null;
    this.addMemberUuid = '';
  }

  getAvailableUsersForTeam(): TeamSummaryUser[] {
    if (!this.managingTeam) return [];
    const memberUuids = new Set(this.managingTeam.members.map((m) => m.uuid));
    return this.users.filter((u) => {
      if (memberUuids.has(u.uuid)) return false;
      // For org teams a user can only belong to one team at a time.
      // Exclude users already assigned to a different org team so admins
      // can't accidentally move someone without intending to.
      if (this.managingTeam!.type === 'org' && u.teamName) return false;
      return true;
    });
  }

  async onAddMember(): Promise<void> {
    if (!this.managingTeam || !this.addMemberUuid) return;
    const { type, name } = this.managingTeam;
    if (name === null) return; // Can't assign to "Unassigned"
    try {
      await this.userService.assignTeamMember(type, name, this.addMemberUuid);
      this.addMemberUuid = '';
      await this.loadTeams();
    } catch (error) {
      this.dialogService.standardError(error, 'Add Member', 'adding the member');
    }
  }

  async onRemoveMember(member: TeamSummaryUser): Promise<void> {
    if (!this.managingTeam) return;
    const { type, name } = this.managingTeam;
    if (name === null) return;
    try {
      await this.userService.removeTeamMember(type, name, member.uuid);
      await this.loadTeams();
    } catch (error) {
      this.dialogService.standardError(error, 'Remove Member', 'removing the member');
    }
  }
}
