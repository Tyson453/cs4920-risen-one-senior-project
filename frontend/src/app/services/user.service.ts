import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type OnboardingStatus = 'email_sent' | 'email_failed' | 'email_skipped' | 'onboarding_complete';

export interface TeamSummaryUser {
  uuid: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  roles: string[];
  assignments: string[];
  state: string;
  startDate: string;
  startYear: string;
  pmTeams: string[];
  teamName?: string | null;
  birthday?: string;
  birthdayNoAcknowledge?: boolean;
  maxHours?: number;
  maxSickHours?: number;
  notes?: string;
  requestedPTO?: Record<string, any>;
  supervisorId?: string;
  onboardingStatus?: OnboardingStatus;
  onboardingCompletedAt?: string;
}

export interface OrgTeamGroup {
  teamName: string | null;
  users: TeamSummaryUser[];
}

export interface PmTeamGroup {
  teamId: string;
  teamName: string;
  users: TeamSummaryUser[];
}

export interface AdminTeamData {
  orgTeams: OrgTeamGroup[];
  pmTeams: PmTeamGroup[];
}

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  public getUserInfo(uuid: string): Promise<any> {
    return firstValueFrom(
      this.http.get(`${this.apiUrl}/users/${uuid}`)
    );
  }

  public getUsers(): Promise<TeamSummaryUser[]> {
    return firstValueFrom(
      this.http.get<TeamSummaryUser[]>(`${this.apiUrl}/users`)
    );
  }

  /**
   * Returns org teams and PM teams for admin view.
   * Backend: GET /teams/admin
   */
  public getTeamsForAdmin(): Promise<AdminTeamData> {
    return firstValueFrom(
      this.http.get<AdminTeamData>(`${this.apiUrl}/teams/admin`)
    );
  }

  /**
   * Returns teammates for non-admin users.
   * Backend: GET /teams/teammates?teamName=xxx&pmTeams=team1,team2&excludeId=uuid
   */
  public getTeammates(
    teamName: string | null,
    pmTeamNames?: string[],
    excludeId?: string
  ): Promise<TeamSummaryUser[]> {
    const params: Record<string, string> = {};
    params['teamName'] = teamName ?? 'null';
    if (pmTeamNames && pmTeamNames.length > 0) {
      params['pmTeams'] = pmTeamNames.join(',');
    }
    if (excludeId) {
      params['excludeId'] = excludeId;
    }

    const queryString = new URLSearchParams(params).toString();
    const url = `${this.apiUrl}/teams/teammates?${queryString}`;
    return firstValueFrom(
      this.http.get<TeamSummaryUser[]>(url)
    );
  }

  /** POST /teams — validate name is unique, returns { type, teamName } */
  public createTeam(type: 'org' | 'pm', teamName: string): Promise<any> {
    return firstValueFrom(
      this.http.post(`${this.apiUrl}/teams`, { type, teamName })
    );
  }

  /** PUT /teams/{type}/{teamName} — rename a team, returns { oldName, newName, updatedCount } */
  public updateTeam(type: 'org' | 'pm', teamName: string, newName: string): Promise<any> {
    return firstValueFrom(
      this.http.put(
        `${this.apiUrl}/teams/${type}/${encodeURIComponent(teamName)}`,
        { newName }
      )
    );
  }

  /** DELETE /teams/{type}/{teamName} — remove team from all users, returns { clearedCount } */
  public deleteTeam(type: 'org' | 'pm', teamName: string): Promise<any> {
    return firstValueFrom(
      this.http.delete(
        `${this.apiUrl}/teams/${type}/${encodeURIComponent(teamName)}`
      )
    );
  }

  /** POST /teams/{type}/{teamName}/members — assign a user to a team */
  public assignTeamMember(type: 'org' | 'pm', teamName: string, uuid: string): Promise<any> {
    return firstValueFrom(
      this.http.post(
        `${this.apiUrl}/teams/${type}/${encodeURIComponent(teamName)}/members`,
        { uuid }
      )
    );
  }

  /** PUT /users/{uuid} — update allowed fields on a user */
  public updateUser(uuid: string, data: Partial<TeamSummaryUser>): Promise<any> {
    return firstValueFrom(
      this.http.put(`${this.apiUrl}/users/${uuid}`, data)
    );
  }

  /** DELETE /users/{uuid} — permanently delete a user */
  public deleteUser(uuid: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.apiUrl}/users/${uuid}`)
    );
  }

  /** DELETE /teams/{type}/{teamName}/members/{uuid} — remove a user from a team */
  public removeTeamMember(type: 'org' | 'pm', teamName: string, uuid: string): Promise<any> {
    return firstValueFrom(
      this.http.delete(
        `${this.apiUrl}/teams/${type}/${encodeURIComponent(teamName)}/members/${uuid}`
      )
    );
  }

  /** POST /create-user — create user with onboarding (temp password + email). Returns created user. */
  public createUser(payload: Record<string, unknown>): Promise<TeamSummaryUser> {
    return firstValueFrom(
      this.http.post<TeamSummaryUser>(`${this.apiUrl}/create-user`, payload)
    );
  }

  /** POST /users/{uuid}/resend-onboarding-email — resend onboarding email. Returns updated user. */
  public resendOnboardingEmail(uuid: string): Promise<TeamSummaryUser> {
    return firstValueFrom(
      this.http.post<TeamSummaryUser>(`${this.apiUrl}/users/${uuid}/resend-onboarding-email`, {})
    );
  }
}
