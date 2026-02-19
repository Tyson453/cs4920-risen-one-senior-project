import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://9fraib9ale.execute-api.us-east-2.amazonaws.com/dev';
  // private apiUrl = 'arn:aws:execute-api:us-east-2:035711552519:9fraib9ale/*/POST/login';

  constructor(private http: HttpClient, private router: Router) { }

  login(username: string, password: string): Observable<boolean> {
    console.log('Attempting login for:', username);
    return this.http.post<{ token: string, user: any }>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        map(response => {
          console.log('Login response received:', response);
          if (response.token && response.user) {
            // Store the JWT token
            localStorage.setItem('authToken', response.token);
            // Store the user in localStorage
            localStorage.setItem('user', JSON.stringify(response.user));
            console.log('Login successful, stored user:', response.user);
            return true;
          }
          console.log('Login response invalid - missing token or user');
          return false;
        }),
        catchError(error => {
          console.error('Login failed with error:', error);
          return of(false);
        })
      );
  }

  logout() {
    // Clear stored authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Redirect to login page
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('authToken');
    return !!token;
  }
}