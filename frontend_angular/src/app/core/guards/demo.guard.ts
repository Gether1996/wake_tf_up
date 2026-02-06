import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const demoGuard: CanActivateFn = (route, state) => {
  // Demo guard removed - all routes are now publicly accessible
  // Users can register/login normally
  return true;
};
