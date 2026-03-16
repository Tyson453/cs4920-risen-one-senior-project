import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';
import { PasswordResetService } from '../../services/password-reset.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AuthShellComponent,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent {
  step: 'request' | 'verify' = 'request';
  usernameForm: FormGroup;
  codeForm: FormGroup;
  errorMessage = '';
  successMessage = '';
  loading = false;

  private enteredUsername = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private passwordResetService: PasswordResetService
  ) {
    this.usernameForm = this.fb.group({
      username: ['', Validators.required],
    });
    this.codeForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
  }

  onRequestCode(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (this.usernameForm.invalid) {
      this.usernameForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.enteredUsername = this.usernameForm.value.username.trim();

    this.http
      .post<{ message: string }>(`${environment.apiUrl}/password-reset/request`, {
        username: this.enteredUsername,
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.successMessage = res.message || 'If an account with that username exists, a recovery code has been sent.';
          this.step = 'verify';
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Something went wrong. Please try again.';
        },
      });
  }

  onVerifyCode(): void {
    this.errorMessage = '';
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }

    const code = this.codeForm.value.code.trim();
    this.passwordResetService.setResetContext(this.enteredUsername, code);
    this.router.navigate(['/set-password']);
  }

  onBackToLogin(): void {
    this.router.navigate(['/login']);
  }
}
