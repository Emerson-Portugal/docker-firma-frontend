import { HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class tokenService {
    private readonly TOKEN_KEY = 'authToken';
    private readonly EXPIRATION_KEY = 'expiration';
    private readonly USER_KEY = 'user';
    private readonly USER_UPDATE_ADVISORDATA = 'updateAdvisorData';

    constructor() {}

    // Obtener token
    getToken(): string | null {
        // Verificar si el token ha expirado
        if (this.isTokenExpired()) {
            this.clearAll();
            return null;
        }
        return localStorage.getItem(this.TOKEN_KEY);
    }

    // Guardar token
    setToken(token: string, expiresIn?: number): void {
        localStorage.setItem(this.TOKEN_KEY, token);

        // Si se proporciona el tiempo de expiración, guardarlo
        if (expiresIn) {
            const now = new Date();
            const expirationDate = new Date(now.getTime() + expiresIn * 1000);
            this.setExpiration(expirationDate.toISOString());
        }
    }

    // Eliminar token
    removeToken(): void {
        localStorage.removeItem(this.TOKEN_KEY);
    }

    // Manejo de expiración (público para que pueda ser llamado desde otros servicios)
    public setExpiration(expiration: string): void {
        localStorage.setItem(this.EXPIRATION_KEY, expiration);
    }

    private getExpiration(): string | null {
        return localStorage.getItem(this.EXPIRATION_KEY);
    }

    removeExpiration(): void {
        localStorage.removeItem(this.EXPIRATION_KEY);
    }

    // Verificar si el token ha expirado
    private isTokenExpired(): boolean {
        const expiration = this.getExpiration();
        if (!expiration) return true; // Si no hay fecha de expiración, considerar como expirado

        const expirationDate = new Date(expiration);
        const now = new Date();

        return now >= expirationDate;
    }

    // Verificar y limpiar si el token ha expirado
    checkAndClearExpiredToken(): boolean {
        const isExpired = this.isTokenExpired();
        if (isExpired) {
            this.showSessionExpiredAlert();
            this.clearAll();
        }
        return isExpired;
    }

    // Mostrar alerta de sesión expirada
    private async showSessionExpiredAlert(): Promise<void> {
        try {
            const Swal = (await import('sweetalert2')).default;
            await Swal.fire({
                title: 'Sesión Expirada',
                text: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
                icon: 'warning',
                confirmButtonText: 'Aceptar',
                allowOutsideClick: false,
                allowEscapeKey: false,
                allowEnterKey: false
            });

            // Limpiar todo y redirigir al login
            this.clearAll();
            window.location.href = '/auth/login';
        } catch (error) {
            console.error('Error al mostrar la alerta de sesión expirada:', error);
            // Si hay un error, redirigir de todos modos
            this.clearAll();
            window.location.href = '/auth/login';
        }
    }

    // Manejo de usuario
    setUser(user: any): void {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }

    getUser(): any {
        // Verificar si el token ha expirado antes de devolver el usuario
        if (this.isTokenExpired()) {
            this.clearAll();
            return null;
        }
        const user = localStorage.getItem(this.USER_KEY);
        return user ? JSON.parse(user) : null;
    }

    removeUser(): void {
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem(this.USER_UPDATE_ADVISORDATA);
    }

    // Obtener headers con token incluido
    getAuthHeaders(): HttpHeaders {
        const token = this.getToken();
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : ''
        });
    }

    // Limpiar todo el almacenamiento relacionado a sesión
    clearAll(): void {
        this.removeToken();
        this.removeExpiration();
        this.removeUser();
    }

    getRole(): string | null {
        // 1) Primero desde el objeto user guardado
        const user = this.getUser();
        if (user?.rol) return String(user.rol).toLowerCase();
        if (user?.role) return String(user.role).toLowerCase();
        if (Array.isArray(user?.roles) && user.roles.length) {
            return String(user.roles[0]).toLowerCase();
        }

        // 2) Si no, desde el JWT
        const token = this.getToken();
        if (!token) return null;

        const payload = this.decodeJwt(token);
        if (!payload) return null;

        if (payload.rol) return String(payload.rol).toLowerCase();
        if (payload.role) return String(payload.role).toLowerCase();
        if (Array.isArray(payload.roles) && payload.roles.length) {
            return String(payload.roles[0]).toLowerCase();
        }

        return null;
    }

    /** True si el usuario tiene alguno de los roles solicitados */
    hasRole(roles: string | string[]): boolean {
        const wanted = Array.isArray(roles) ? roles : [roles];
        const userRole = this.getRole();
        if (!userRole) return false;
        return wanted.map((r) => r.toLowerCase()).includes(userRole);
    }

    /** Decodifica el payload del JWT (base64url-safe) */
    private decodeJwt(token: string): any | null {
        try {
            const base64Url = token.split('.')[1];
            if (!base64Url) return null;
            // base64url -> base64
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const json = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
                    .join('')
            );
            return JSON.parse(json);
        } catch {
            return null;
        }
    }

    /** Devuelve el nombre completo del usuario */
    getFullName(): string | null {
        const u = this.getUser();
        if (u?.full_name) return String(u.full_name);
        if (u?.nombre) return String(u.nombre);
        if (u?.name) return String(u.name);
        if (u?.email) return String(u.email); // fallback
        // Intento desde JWT (por si viene en el payload)
        const p = this.getJwtPayload();
        if (p?.full_name) return String(p.full_name);
        if (p?.name) return String(p.name);
        if (p?.email) return String(p.email);
        return null;
    }

    /** Devuelve el DNI (en tus tokens suele venir en sub) */
    getDni(): string | null {
        const u = this.getUser();
        if (u?.dni) return String(u.dni);
        const p = this.getJwtPayload();
        if (p?.dni) return String(p.dni);
        if (p?.sub) return String(p.sub);
        return null;
    }

    /** Devuelve payload del JWT ya decodificado */
    private getJwtPayload(): any | null {
        const token = this.getToken();
        if (!token) return null;
        return this.decodeJwt(token);
    }
}
