import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {provideNativeDateAdapter} from '@angular/material/core';
import { AuthService } from '../../auth.service';


interface previousRequest {
  value: string;
  viewValue: string;
}


@Component({
  selector: 'app-login',
  providers: [provideNativeDateAdapter()],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  standalone: false,
  template: `
  <input type="text" [(ngModel)]="username" placeholder="Username">
  <input type="password" [(ngModel)]="password" placeholder="Password">
  <button (click)="login()">Login</button>
`
})
export class LoginComponent {
  username: string = ''; // Initialize with an empty string
  password: string = ''; // Initialize with an empty string

  constructor(private authService: AuthService, private router: Router) { }

  login() {
    this.authService.login(this.username, this.password)
      .subscribe({
        next: (success) => {
          if (success) {
            // Navigate to home component if login is successful
            this.router.navigate(['/home']);
          } else {
            // Handle login failure
            console.error('Login failed');
          }
        },
        error: (error) => {
          // Handle login error
          console.error('Login error:', error);
        }
      });
  }
}






