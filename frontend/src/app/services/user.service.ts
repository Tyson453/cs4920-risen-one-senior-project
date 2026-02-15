import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
  /** Mock users for team summary - aligns with backend database structure */
  private readonly mockUsers: TeamSummaryUser[] = [
    {
      uuid: 'john-doe-uuid',
      name: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@risen-one.com',
      roles: ['EMPLOYEE', 'ADMIN', 'LEAD', 'PM'],
      assignments: ['51506e92-650c-4c84-a15f-752370243891'],
      state: 'Kansas',
      startDate: '08/01',
      startYear: '2021',
      pmTeams: ['Project Alpha'],
      birthday: '',
      birthdayNoAcknowledge: false,
      maxHours: 120,
      maxSickHours: 40,
      notes: '',
      requestedPTO: {},
    },
    {
      uuid: 'jane-smith-uuid',
      name: 'Jane Smith',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@risen-one.com',
      roles: ['EMPLOYEE', 'LEAD'],
      assignments: ['62617f03-761d-5d95-b26g-863481354902'],
      state: 'Missouri',
      startDate: '09/15',
      startYear: '2022',
      pmTeams: [],
      birthday: '',
      birthdayNoAcknowledge: false,
      maxHours: 120,
      maxSickHours: 40,
      notes: '',
      requestedPTO: {},
    },
    {
      uuid: 'bob-johnson-uuid',
      name: 'Bob Johnson',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@risen-one.com',
      roles: ['EMPLOYEE'],
      assignments: ['51506e92-650c-4c84-a15f-752370243891'],
      state: 'Missouri',
      startDate: '03/10',
      startYear: '2023',
      pmTeams: [],
      birthday: '',
      birthdayNoAcknowledge: false,
      maxHours: 120,
      maxSickHours: 40,
      notes: ' ',
      requestedPTO: {},
    },
    {
      uuid: 'alice-williams-uuid',
      name: 'Alice Williams',
      firstName: 'Alice',
      lastName: 'Williams',
      email: 'alice.williams@risen-one.com',
      roles: ['EMPLOYEE'],
      assignments: ['62617f03-761d-5d95-b26g-863481354902'],
      state: 'California',
      startDate: '01/15',
      startYear: '2024',
      pmTeams: [],
      birthday: '',
      birthdayNoAcknowledge: false,
      maxHours: 120,
      maxSickHours: 40,
      notes: '',
      requestedPTO: {},
    },
    {
      uuid: 'charlie-brown-uuid',
      name: 'Charlie Brown',
      firstName: 'Charlie',
      lastName: 'Brown',
      email: 'charlie.brown@risen-one.com',
      roles: ['EMPLOYEE'],
      assignments: [],
      state: 'Texas',
      startDate: '06/01',
      startYear: '2023',
      pmTeams: [],
      birthday: '',
      birthdayNoAcknowledge: false,
      maxHours: 120,
      maxSickHours: 40,
      notes: '',
      requestedPTO: {},
    },
  ];

  constructor() {}

  public getUserInfo(uuid: string) {
    //TODO change this to get user data from the backend
    const user = {
      uuid: 'XXX',
      name: 'John Doe',
      email: 'john.doe@example.com',
      assignments: ['468879bf-8e44-4c95-8321-edd2b8fb0108'],
      birthday: '',
    };

    return new Promise((resolve) => {
      resolve(user);
    });
  }

  public getUsers() {
    //TODO change this to get user data from the backend
    return new Promise((resolve) => {
      resolve(this.mockUsers);
    });
  }

  /**
   * Returns org teams and PM teams for admin view.
   * Stub implementation - replace with backend call when available.
   */
  public getTeamsForAdmin(): Promise<AdminTeamData> {
    const orgTeamMap = new Map<string, TeamSummaryUser[]>();
    const pmTeamMap = new Map<
      string,
      { teamName: string; users: TeamSummaryUser[] }
    >();

    for (const user of this.mockUsers) {
      const teamName = 'None';
      if (!orgTeamMap.has(teamName)) {
        orgTeamMap.set(teamName, []);
      }
      orgTeamMap.get(teamName)!.push(user);

      for (const pmTeamName of user.pmTeams ?? []) {
        if (!pmTeamMap.has(pmTeamName)) {
          pmTeamMap.set(pmTeamName, {
            teamName: pmTeamName,
            users: [],
          });
        }
        pmTeamMap.get(pmTeamName)!.users.push(user);
      }
    }

    const orgTeams: OrgTeamGroup[] = Array.from(orgTeamMap.entries()).map(
      ([teamName, users]) => ({
        teamName,
        users,
      })
    );

    const pmTeams: PmTeamGroup[] = Array.from(pmTeamMap.entries()).map(
      ([teamId, { teamName, users }]) => ({
        teamId,
        teamName,
        users,
      })
    );

    return Promise.resolve({ orgTeams, pmTeams });
  }

  /**
   * Returns teammates for non-admin: same org team (teamName) or users in PM teams (pmTeamNames).
   * Stub implementation - replace with backend call when available.
   */
  public getTeammates(
    state: string,
    pmTeamNames?: string[]
  ): Promise<TeamSummaryUser[]> {
    if (pmTeamNames && pmTeamNames.length > 0) {
      const names = new Set(pmTeamNames);
      const users = this.mockUsers.filter((u) =>
        (u.pmTeams ?? []).some((name) => names.has(name))
      );
      return Promise.resolve(users);
    }

    // const users = this.mockUsers.filter((u) => u.state === state);
    return Promise.resolve(this.mockUsers);
  }

  public getProjects() {
    //TODO change this to get project data from the backend
    const projects = [
      {
        uuid: '51506e92-650c-4c84-a15f-752370243891',
        contract: 'Contract',
        description: 'example description',
        pointOfContact: 'John Doe',
        productManager: '',
        productOwner: 'John Doe',
        projectFullName: 'Project 22',
        projectName: 'PR22',
        startDate: '01/01/2021',
        status: 'Active',
      },
      {
        uuid: '62617f03-761d-5d95-b26g-863481354902',
        contract: 'Contract',
        description: 'another project description',
        pointOfContact: 'Jane Smith',
        productManager: 'Alice Williams',
        productOwner: 'Jane Smith',
        projectFullName: 'Project 33',
        projectName: 'PR33',
        startDate: '02/15/2022',
        status: 'Active',
      },
      {
        uuid: '73728g14-872e-6e06-c37h-974592365013',
        contract: 'Contract',
        description: 'inactive project',
        pointOfContact: 'Bob Johnson',
        productManager: '',
        productOwner: 'Bob Johnson',
        projectFullName: 'Legacy Project',
        projectName: 'LEG',
        startDate: '06/01/2020',
        status: 'Inactive',
      },
    ];

    return new Promise((resolve) => {
      resolve(projects);
    });
  }
}
