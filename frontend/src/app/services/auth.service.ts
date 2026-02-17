import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

@Injectable({ providedIn: 'root' })
export class AuthService {
  public user: Promise<any>;
  public loggedIn: boolean | undefined;

  constructor(
    private router: Router,
    private dialogRef: MatDialog
  ) {
    this.user = this.setUser();
  }

  signOut() {
    this.dialogRef.closeAll();
    //apply logout if needed
    this.router.navigate(['/login']);
  }

  getUser() {
    return this.user;
  }

  async setUser() {
    try {
      let user = {
        uuid: 'john-doe-uuid',
        id: 'john-doe-uuid',
        name: 'John Doe',
        email: 'john.doe@risen-one.com',
        assignments: [
          "51506e92-650c-4c84-a15f-752370243891"
        ],
        birthday: "",
        roles: ['EMPLOYEE', 'ADMIN', 'LEAD', 'PM'],
        teamName: 'Engineering',
        pmTeams: ['pm-team-project-alpha'],
      }
      return new Promise((resolve) => { resolve(user) })
    } catch (err) {
      console.log('not signed in: ' + err)
      this.router.navigate(['/login'])
      return null;
    }
  }

  checkLoggedIn() {
    return this.user;
  }

  async adminCheck() {
    let user = await this.user;
    return !!user?.roles?.includes('ADMIN');
  }
  async leadCheck() {
    let user = await this.user;
    if (user.roles.includes('LEAD')) {
      return true;
    } else {
      return false;
    }
  }
  async leadAdminCheck() {
    let user = await this.user;
    if (user.roles.includes('LEAD') || user.roles.includes('ADMIN')) {
      return true;
    } else {
      return false;
    }
  }
  async testerCheck() {
    let user = await this.user;
    if (user.roles.includes('TESTER')) {
      return true;
    } else {
      return false;
    }
  }
  async pmCheck() {
    let user = await this.user;
    if (user.roles.includes('PM')) {
      return true;
    } else {
      return false;
    }
  }
  async pmAdminCheck() {
    let user = await this.user;
    if (user.roles.includes('PM') || user.roles.includes('ADMIN')) {
      return true;
    } else {
      return false;
    }
  }
  async interimLeadCheck() {
    let user = await this.user;
    if (user.roles.includes('INTERIM_LEAD')) {
      return true;
    } else {
      return false;
    }
  }
}
