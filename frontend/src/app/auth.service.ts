import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Production URL - uncomment when deploying
  // private apiUrl = 'https://9fraib9ale.execute-api.us-east-2.amazonaws.com/dev';
  // Local development URL
  private apiUrl = 'http://localhost:3000/dev';

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
            console.log('Login successful');
            return true;
          }
          console.log('Login `response invalid - missing token or user');
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
    
    // Redirect to login page
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('authToken');
    return !!token;
  }
}