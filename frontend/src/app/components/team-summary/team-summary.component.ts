import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { AuthService } from '../../services/auth.service';
import { UserApiService, TeamSummaryUser, OrgTeamGroup, PmTeamGroup, AdminTeamData } from '../../services/user.service';
import { DialogService } from '../../services/dialog.service';
import { ProjectApiService } from '../../services/project-api.service';
import { RocConstants } from '../../shared/constants/roc-constants';

@Component({
  selector: 'app-team-summary',
  standalone: false,
  templateUrl: './team-summary.component.html',
  styleUrls: ['./team-summary.component.scss']
})
export class TeamSummaryComponent implements OnInit {
  isAdmin = false;
  orgTeams: OrgTeamGroup[] = [];
  pmTeams: PmTeamGroup[] = [];
  teammates: TeamSummaryUser[] = [];
  projectIdToNameMap = new Map<string, string>();
  teammatesDataSource = new MatTableDataSource<TeamSummaryUser>([]);
  displayedColumns: string[] = ['name', 'email', 'roles', 'projects', 'startDate'];

  constructor(
    private authService: AuthService,
    private userApiService: UserApiService,
    private dialogService: DialogService,
    private projectApiService: ProjectApiService
  ) {}

  ngOnInit(): void {
    this.dialogService.openSpinner();
    this.loadProjectMap().then(() => {
      this.authService.getUser().then(async (user: any) => {
        this.isAdmin = await this.authService.adminCheck();
        if (this.isAdmin) {
          await this.loadTeamsForAdmin();
        } else {
          await this.loadTeammates(user);
        }
        this.dialogService.closeSpinner();
      }).catch((err) => {
        this.dialogService.standardError(err, 'Loading Team Summary', 'loading the team summary');
      });
    }).catch((err) => {
      this.dialogService.standardError(err, 'Loading Projects', 'loading project data');
    });
  }

  private loadProjectMap(): Promise<void> {
    return new Promise((resolve) => {
      this.projectApiService.getProjects().subscribe((projects: any) => {
        this.projectIdToNameMap.set(RocConstants.DEFAULT_PROJECT, RocConstants.DEFAULT_PROJECT);
        for (const p of projects) {
          this.projectIdToNameMap.set(p.uuid, p.projectName || p.projectFullName || p.uuid);
        }
        resolve();
      });
    });
  }

  private async loadTeamsForAdmin(): Promise<void> {
    try {
      const data: AdminTeamData = await this.userApiService.getTeamsForAdmin();
      this.orgTeams = data.orgTeams;
      this.pmTeams = data.pmTeams;
    } catch (err) {
      this.dialogService.standardError(err, 'Loading Teams', 'loading teams for admin');
    }
  }

  private async loadTeammates(user: any): Promise<void> {
    try {
      const teamName = user?.teamName ?? null;
      const pmTeamIds = user?.pmTeams && user.pmTeams.length > 0 ? user.pmTeams : undefined;
      this.teammates = await this.userApiService.getTeammates(teamName, pmTeamIds);
      this.teammatesDataSource.data = this.teammates;
    } catch (err) {
      this.dialogService.standardError(err, 'Loading Teammates', 'loading teammates');
    }
  }

  getProjectNames(assignments: string[]): string {
    if (!assignments || assignments.length === 0) {
      return '—';
    }
    const names = assignments
      .map((id) => this.projectIdToNameMap.get(id) ?? id)
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : '—';
  }

  getRolesDisplay(roles: string[]): string {
    return roles?.join(', ') ?? '—';
  }

  getStartDateDisplay(user: TeamSummaryUser): string {
    if (user.startDate && user.startYear) {
      return `${user.startDate}/${user.startYear}`;
    }
    return user.startDate ?? user.startYear ?? '—';
  }

  getTeamDisplayName(teamName: string | null): string {
    return teamName ?? 'Unassigned';
  }
}
