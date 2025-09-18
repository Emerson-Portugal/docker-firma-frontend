// src/app/core/auth/role.guard.ts
import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { getUserFromStorage } from './user-storage';

type UserRole = 'rrhh' | 'empleado' | 'soporte';

export const roleGuard = (allowed: UserRole[]): CanMatchFn => {
    return (_route, _segments: UrlSegment[]) => {
        const router = inject(Router);
        const user = getUserFromStorage();

        // 1) No logueado → al login
        if (!user) {
            router.navigateByUrl('/auth/login');
            return false;
        }

        // 2) Inactivo → al login (o página de acceso denegado)
        if (user.activo === false) {
            router.navigateByUrl('/auth/login');
            return false;
        }

        // 3) Rol permitido
        if (allowed.includes(user.rol as UserRole)) return true;

        // 4) Rol NO permitido → redirige a la home de firma (o donde prefieras)
        router.navigateByUrl('/signature/home');
        return false;
    };
};
