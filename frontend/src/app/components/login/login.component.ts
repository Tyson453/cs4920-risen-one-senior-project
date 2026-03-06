import { Component, OnInit } from '@angular/core';
import {provideNativeDateAdapter} from '@angular/material/core';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-login',
  providers: [provideNativeDateAdapter()],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  username: string = ''; // Initialize with an empty string
  password: string = ''; // Initialize with an empty string
  loginError: boolean = false;
  errorMessage: string = '';

  constructor(private authService: AuthService) { }

  ngOnInit() {
    localStorage.removeItem('authToken');
    sessionStorage.clear();
  }

  login() {
    console.log('Login method called with username:', this.username);
    this.authService.login(this.username, this.password)
      .subscribe({
        next: (success) => {
          if (success) {
            // AuthService handles redirect (home or set-password for temp password)
          } else {
            // Handle login failure
            this.loginError = true;
            this.errorMessage = 'Username or Password is incorrect';
            console.error('Login failed');
          }
        },
        error: (error) => {
          // Handle login error
          this.loginError = true;
          this.errorMessage = 'Username or Password is incorrect';
          console.error('Login error:', error);
        }
      });
  }
}






