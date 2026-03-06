import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private router: Router, private http: HttpClient) {}

  // ✅ FRONTEND LOGIN (calls backend)
  login(username: string, password: string): Observable<boolean> {
    return this.http
      .post<{ token: string; user: any }>(`${this.apiUrl}/login`, {
        username,
        password,
      })
      .pipe(
        map((response) => {
          if (response?.token && response?.user) {
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            if (response.user.temporaryPassword) {
              this.router.navigate(['/set-password']);
            } else {
              this.router.navigate(['/home']);
            }
            return true;
          }
          return false;
        }),
        catchError((err) => {
          console.error('Login failed:', err);
          return of(false);
        })
      );
  }

  // ✅ used by other components (employee-development uses this)
  async getUser(): Promise<any> {
    return this.setUser();
  }

  private async setUser(): Promise<any> {
    try {
      const stored = localStorage.getItem('currentUser');
      if (!stored) return null;

      const user = JSON.parse(stored);
      if (user.uuid && !user.id) user.id = user.uuid;
      return user;
    } catch (err) {
      console.log('Auth parse error:', err);
      return null;
    }
  }

  // ✅ guard helper
  isLoggedIn(): boolean {
    return !!localStorage.getItem('authToken');
  }

  getCurrentUserSnapshot(): any | null {
    try {
      const stored = localStorage.getItem('currentUser');
      if (!stored) return null;

      const user = JSON.parse(stored);
      if (user?.uuid && !user?.id) {
        user.id = user.uuid;
      }
      return user;
    } catch (err) {
      console.log('Auth parse error:', err);
      return null;
    }
  }

  hasTemporaryPassword(): boolean {
    return !!this.getCurrentUserSnapshot()?.temporaryPassword;
  }

  // ✅ keep BOTH names so nothing breaks
  logout() {
    this.signOut();
  }

  signOut() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  // (optional helpers used around the app)
  async adminCheck() {
    const user = await this.getUser();
    return !!user?.roles?.includes('ADMIN');
  }
  async leadCheck() {
    const user = await this.getUser();
    return !!user?.roles?.includes('LEAD');
  }
  async pmCheck() {
    const user = await this.getUser();
    return !!user?.roles?.includes('PM');
  }
}