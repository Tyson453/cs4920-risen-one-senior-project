import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';
import { AuthService } from '../../services/auth.service';
import { PasswordResetService } from '../../services/password-reset.service';

type SetPasswordMode = 'onboarding' | 'forgot-password';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AuthShellComponent,
  ],
  templateUrl: './set-password.component.html',
  styleUrls: ['./set-password.component.css'],
})
export class SetPasswordComponent implements OnInit {
  form: FormGroup;
  errorMessage = '';
  loading = false;
  mode: SetPasswordMode = 'onboarding';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private passwordResetService: PasswordResetService
  ) {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn() && this.authService.hasTemporaryPassword()) {
      this.mode = 'onboarding';
    } else if (this.passwordResetService.hasResetContext()) {
      this.mode = 'forgot-password';
    }
  }

  onSubmit(): void {
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { newPassword, confirmPassword } = this.form.value;
    if (newPassword !== confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }
    this.loading = true;

    if (this.mode === 'onboarding') {
      this.submitOnboarding(newPassword, confirmPassword);
    } else {
      this.submitForgotPassword(newPassword, confirmPassword);
    }
  }

  private submitOnboarding(newPassword: string, confirmPassword: string): void {
    this.http
      .post<{ message: string }>(`${environment.apiUrl}/set-password`, {
        newPassword,
        confirmPassword,
      })
      .subscribe({
        next: () => {
          const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
          if (user) {
            user.temporaryPassword = false;
            localStorage.setItem('currentUser', JSON.stringify(user));
          }
          this.router.navigate(['/home']);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Failed to update password';
        },
      });
  }

  private submitForgotPassword(newPassword: string, confirmPassword: string): void {
    const ctx = this.passwordResetService.getResetContext();
    if (!ctx) {
      this.loading = false;
      this.errorMessage = 'Reset session expired. Please start over.';
      return;
    }

    this.http
      .post<{ message: string }>(`${environment.apiUrl}/password-reset/complete`, {
        username: ctx.username,
        code: ctx.code,
        newPassword,
        confirmPassword,
      })
      .subscribe({
        next: () => {
          this.passwordResetService.clearResetContext();
          this.authService.login(ctx.username, newPassword).subscribe({
            next: (success) => {
              if (!success) {
                this.loading = false;
                this.errorMessage = 'Password updated but auto-login failed. Please log in manually.';
                this.router.navigate(['/login']);
              }
            },
            error: () => {
              this.loading = false;
              this.router.navigate(['/login']);
            },
          });
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Invalid or expired code';
        },
      });
  }
}
