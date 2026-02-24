import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TeamSummaryUser {
  uuid: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
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

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  public getUserInfo(uuid: string): Promise<any> {
    return firstValueFrom(
      this.http.get(`${this.apiUrl}/users/${uuid}`, { headers: this.getAuthHeaders() })
    );
  }

  public getUsers(): Promise<TeamSummaryUser[]> {
    return firstValueFrom(
      this.http.get<TeamSummaryUser[]>(`${this.apiUrl}/users`, { headers: this.getAuthHeaders() })
    );
  }

  /**
   * Returns org teams and PM teams for admin view.
   * Backend: GET /teams/admin
   */
  public getTeamsForAdmin(): Promise<AdminTeamData> {
    return firstValueFrom(
      this.http.get<AdminTeamData>(`${this.apiUrl}/teams/admin`, { headers: this.getAuthHeaders() })
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
      this.http.get<TeamSummaryUser[]>(url, { headers: this.getAuthHeaders() })
    );
  }
}
