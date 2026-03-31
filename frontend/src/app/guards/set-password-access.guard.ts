import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PasswordResetService } from '../services/password-reset.service';

export const setPasswordAccessGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const passwordResetService = inject(PasswordResetService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.hasTemporaryPassword()) {
    return true;
  }

  if (passwordResetService.hasResetContext()) {
    return true;
  }

  if (authService.isLoggedIn()) {
    return router.createUrlTree(['/home']);
  }

  return router.createUrlTree(['/login']);
};
