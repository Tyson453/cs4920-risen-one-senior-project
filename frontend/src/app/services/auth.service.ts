import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  public user: Promise<any>;
  public loggedIn: boolean | undefined;

  constructor(
    private router: Router,
  ) {
    this.user = this.setUser();
  }

  signOut() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  getUser() {
    this.user = this.setUser();
    return this.user;
  }

  async setUser() {
    try {
      const stored = localStorage.getItem('currentUser');
      if (!stored) {
        this.router.navigate(['/login']);
        return null;
      }
      const user = JSON.parse(stored);
      // Normalize: backend returns uuid but not always id
      if (user.uuid && !user.id) {
        user.id = user.uuid;
      }
      return user;
    } catch (err) {
      console.log('not signed in: ' + err);
      this.router.navigate(['/login']);
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
    if (user?.roles?.includes('LEAD')) {
      return true;
    } else {
      return false;
    }
  }
  async leadAdminCheck() {
    let user = await this.user;
    if (user?.roles?.includes('LEAD') || user?.roles?.includes('ADMIN')) {
      return true;
    } else {
      return false;
    }
  }
  async testerCheck() {
    let user = await this.user;
    if (user?.roles?.includes('TESTER')) {
      return true;
    } else {
      return false;
    }
  }
  async pmCheck() {
    let user = await this.user;
    if (user?.roles?.includes('PM')) {
      return true;
    } else {
      return false;
    }
  }
  async pmAdminCheck() {
    let user = await this.user;
    if (user?.roles?.includes('PM') || user?.roles?.includes('ADMIN')) {
      return true;
    } else {
      return false;
    }
  }
  async interimLeadCheck() {
    let user = await this.user;
    if (user?.roles?.includes('INTERIM_LEAD')) {
      return true;
    } else {
      return false;
    }
  }
}
