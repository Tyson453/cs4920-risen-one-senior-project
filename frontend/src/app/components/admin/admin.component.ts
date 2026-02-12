import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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
import { AuthService } from '../../services/auth.service';
import { UserApiService, TeamSummaryUser } from '../../services/user.service';
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

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
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
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
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
  displayedColumns: string[] = [
    'name',
    'email',
    'state',
    'startDate',
    'actions',
  ];

  constructor(
    private authService: AuthService,
    private userService: UserApiService,
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

  private checkAdminAccess(): void {
    if (!this.authService.adminCheck()) {
      this.router.navigate(['/home']);
    }
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
    });
  }

  private loadData(): void {
    this.isLoading = true;
    Promise.all([
      this.userService.getUsers() as Promise<TeamSummaryUser[]>,
      this.userService.getProjects() as Promise<Project[]>,
    ])
      .then(([users, projects]) => {
        console.log(users);
        this.users = users as TeamSummaryUser[];
        this.projects = projects as Project[];
        this.isLoading = false;
      })
      .catch((error) => {
        console.error('Error loading data:', error);
        this.dialogService.standardError(
          error,
          'Load Error',
          'Failed to load users and projects'
        );
        this.isLoading = false;
      });
  }

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
    if (!startDate || !startYear) {
      return new Date();
    }
    const [month, day] = startDate.split('/');
    // Create date in local timezone, not UTC
    return new Date(parseInt(startYear), parseInt(month) - 1, parseInt(day));
  }

  onSaveEdit(): void {
    if (!this.editForm.valid) {
      return;
    }

    const formValue = this.editForm.value;
    const selectedDate = new Date(formValue.startDate);
    const newStartDate = `${String(selectedDate.getMonth() + 1).padStart(
      2,
      '0'
    )}/${String(selectedDate.getDate()).padStart(2, '0')}`;
    const newStartYear = selectedDate.getFullYear().toString();

    if (this.isCreatingNewUser) {
      // Create new user
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
        birthday: '',
        birthdayNoAcknowledge: false,
        maxHours: 120,
        maxSickHours: 40,
        notes: '',
        requestedPTO: {},
      };

      // TODO: Call backend API to create user
      // For now, add to mock data
      this.users.push(newUser);

      this.dialogService.saveSuccessOpen({
        panelClass: 'delete-modal',
        width: '600px',
        data: {
          title: 'User Created',
          text: 'User created successfully',
        },
      });
    } else if (this.editingUser) {
      // Update existing user
      const updatedUser: TeamSummaryUser = {
        ...this.editingUser,
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
      };

      // TODO: Call backend API to update user
      // For now, update the mock data
      const index = this.users.findIndex(
        (u) => u.uuid === this.editingUser!.uuid
      );
      if (index !== -1) {
        this.users[index] = updatedUser;
      }

      this.dialogService.saveSuccessOpen({
        panelClass: 'delete-modal',
        width: '600px',
        data: {
          title: 'User Updated',
          text: 'User updated successfully',
        },
      });
    }

    this.onCancelEdit();
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
    if (!this.editingUser) {
      return;
    }

    this.userToDelete = this.editingUser;
    this.showDeleteConfirmation = true;
  }

  onConfirmDelete(): void {
    if (!this.userToDelete) {
      return;
    }

    // TODO: Call backend API to delete user
    // For now, remove from mock data
    this.users = this.users.filter((u) => u.uuid !== this.userToDelete!.uuid);
    this.dialogService.saveSuccessOpen({
      panelClass: 'delete-modal',
      width: '600px',
      data: {
        title: 'User Deleted',
        text: 'User deleted successfully',
      },
    });
    this.onCancelEdit();
    this.showDeleteConfirmation = false;
    this.userToDelete = null;
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
}
