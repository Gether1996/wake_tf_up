import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const demoGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // Check if demo access is granted
  const demoAccess = localStorage.getItem('demo_access');
  const accessToken = localStorage.getItem('access_token');
  
  if (demoAccess === 'true' && accessToken) {
    return true;
  }
  
  // Redirect to demo login
  router.navigate(['/demo-login']);
  return false;
};
