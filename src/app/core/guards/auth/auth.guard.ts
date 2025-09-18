import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { inject } from '@angular/core';
import { tokenService } from '../../services/tokenService/token.service';

export const authGuard: CanMatchFn = (_route, segments: UrlSegment[]) => {
  const router = inject(Router);
  const tokens = inject(tokenService);

  // Si el token expiró, limpia y bloquea
  if (tokens.checkAndClearExpiredToken()) {
    router.navigate(['/auth/login'], {
      queryParams: { returnUrl: '/' + segments.map(s => s.path).join('/') },
    });
    return false;
  }

  const token = tokens.getToken();
  const user  = tokens.getUser();

  // Si falta token o usuario, fuera
  if (!token || !user) {
    router.navigate(['/auth/login'], {
      queryParams: { returnUrl: '/' + segments.map(s => s.path).join('/') },
    });
    return false;
  }

  return true;
};
