import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface TeamSummaryUser {
  uuid: string;
  name: string;
  email: string;
  roles: string[];
  assignments: string[];
  startDate?: string;
  startYear?: string;
  teamName?: string | null;
  pmTeams?: string[];
  pmTeamMembership?: string[];
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

  /** Mock users for team summary - aligns with backend import-data structure */
  private readonly mockUsers: TeamSummaryUser[] = [
    {
      uuid: 'john-doe-uuid',
      name: 'John Doe',
      email: 'john.doe@risen-one.com',
      roles: ['EMPLOYEE', 'ADMIN', 'LEAD', 'PM'],
      assignments: ['51506e92-650c-4c84-a15f-752370243891'],
      startDate: '08/01',
      startYear: '2021',
      teamName: 'Engineering',
      pmTeams: ['pm-team-project-alpha'],
      pmTeamMembership: ['pm-team-project-alpha'],
    },
    {
      uuid: 'jane-smith-uuid',
      name: 'Jane Smith',
      email: 'jane.smith@risen-one.com',
      roles: ['EMPLOYEE', 'LEAD'],
      assignments: ['62617f03-761d-5d95-b26g-863481354902'],
      startDate: '09/15',
      startYear: '2022',
      teamName: 'Engineering',
      pmTeams: [],
      pmTeamMembership: [],
    },
    {
      uuid: 'bob-johnson-uuid',
      name: 'Bob Johnson',
      email: 'bob.johnson@risen-one.com',
      roles: ['EMPLOYEE'],
      assignments: ['51506e92-650c-4c84-a15f-752370243891'],
      startDate: '03/10',
      startYear: '2023',
      teamName: 'Engineering',
      pmTeams: [],
      pmTeamMembership: ['pm-team-project-alpha'],
    },
    {
      uuid: 'alice-williams-uuid',
      name: 'Alice Williams',
      email: 'alice.williams@risen-one.com',
      roles: ['EMPLOYEE'],
      assignments: ['62617f03-761d-5d95-b26g-863481354902'],
      startDate: '01/15',
      startYear: '2024',
      teamName: 'Design',
      pmTeams: [],
      pmTeamMembership: [],
    },
    {
      uuid: 'charlie-brown-uuid',
      name: 'Charlie Brown',
      email: 'charlie.brown@risen-one.com',
      roles: ['EMPLOYEE'],
      assignments: [],
      startDate: '06/01',
      startYear: '2023',
      teamName: null,
      pmTeams: [],
      pmTeamMembership: [],
    },
  ];

  constructor() { }

  public getUserInfo(uuid: string) {
    //TODO change this to get user data from the backend
    const user = {
      uuid: 'XXX',
      name: 'John Doe',
      email: 'john.doe@example.com',
      assignments: [
        "468879bf-8e44-4c95-8321-edd2b8fb0108"
      ],
      birthday: "",
    }

    return new Promise((resolve) => { resolve(user) });
  }

  public getUsers() {
    //TODO change this to get user data from the backend
    const users = [{
      uuid: 'XXX',
      name: 'John Doe',
      email: 'john.doe@example.com',
      assignments: [
        "468879bf-8e44-4c95-8321-edd2b8fb0108"
      ],
      birthday: "",
    }]

    return new Promise((resolve) => { resolve(users) });
  }

  /**
   * Returns org teams and PM teams for admin view.
   * Stub implementation - replace with backend call when available.
   */
  public getTeamsForAdmin(): Promise<AdminTeamData> {
    const orgTeamMap = new Map<string | null, TeamSummaryUser[]>();
    const pmTeamMap = new Map<string, { teamName: string; users: TeamSummaryUser[] }>();

    const pmTeamNames: Record<string, string> = {
      'pm-team-project-alpha': 'Project Alpha',
    };

    for (const user of this.mockUsers) {
      const teamName = user.teamName ?? null;
      if (!orgTeamMap.has(teamName)) {
        orgTeamMap.set(teamName, []);
      }
      orgTeamMap.get(teamName)!.push(user);

      for (const pmTeamId of user.pmTeamMembership ?? []) {
        if (!pmTeamMap.has(pmTeamId)) {
          pmTeamMap.set(pmTeamId, {
            teamName: pmTeamNames[pmTeamId] ?? pmTeamId,
            users: [],
          });
        }
        pmTeamMap.get(pmTeamId)!.users.push(user);
      }
    }

    const orgTeams: OrgTeamGroup[] = Array.from(orgTeamMap.entries()).map(([teamName, users]) => ({
      teamName,
      users,
    }));

    const pmTeams: PmTeamGroup[] = Array.from(pmTeamMap.entries()).map(([teamId, { teamName, users }]) => ({
      teamId,
      teamName,
      users,
    }));

    return Promise.resolve({ orgTeams, pmTeams });
  }

  /**
   * Returns teammates for non-admin: same org team (teamName) or users in PM teams (pmTeamIds).
   * Stub implementation - replace with backend call when available.
   */
  public getTeammates(teamName: string | null, pmTeamIds?: string[]): Promise<TeamSummaryUser[]> {
    if (pmTeamIds && pmTeamIds.length > 0) {
      const ids = new Set(pmTeamIds);
      const users = this.mockUsers.filter((u) =>
        (u.pmTeamMembership ?? []).some((mid) => ids.has(mid))
      );
      return Promise.resolve(users);
    }

    const tn = teamName ?? null;
    const users = this.mockUsers.filter((u) => (u.teamName ?? null) === tn);
    return Promise.resolve(users);
  }

  public getProjects() {
    //TODO change this to get project data from the backend
    const projects = [
      {
        uuid: "468879bf-8e44-4c95-8321-edd2b8fb0108",
        projectFullName: "SOME FULL PROJECT NAME",
        projectName: "SFPN",
        startDate: "12/31/2024",
        status: "Active"
      },
      {
        uuid: "8242e65d-75ac-4f4b-b761-05b9343b8507",
        projectFullName: "PROJECT OF IMPORTANCE",
        projectName: "POI",
        startDate: "12/31/2024",
        status: "Active"
      }
    ]

    return new Promise((resolve) => { resolve(projects) });
  }
}
