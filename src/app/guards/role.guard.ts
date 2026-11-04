import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export type AppRole = 'ADMIN' | 'OPERATOR' | 'SPECTRUM_MANAGER' | 'FINANCE_MANAGER' | 'VIEWER' | 'CLIENT';

export function roleGuard(allowedRoles: AppRole[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = authService.getCurrentUser();
    if (!user) {
      router.navigate(['/login']);
      return false;
    }

    if (allowedRoles.includes(user.role as AppRole)) {
      return true;
    }

    // Redirect to dashboard if authenticated but not authorized
    router.navigate(['/dashboard']);
    return false;
  };
}
