import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { tokenService } from '../../core/services/tokenService/token.service'; // ajusta la ruta

@Component({
    selector: 'app-header-signature',
    standalone: true,
    imports: [RouterModule, CommonModule],
    templateUrl: './header-signature.component.html'
})
export class HeaderSignatureComponent {
    // Menús
    showEllipsisMenu = false; // móvil
    showUserMenu = false; // desktop

    // Flags y datos de usuario
    isHRView = false;
    userName: string | null = null;
    userDni: string | null = null;

    private router = inject(Router);
    private tokenSrv = inject(tokenService);

    constructor() {
        this.refreshRoleAndUser(); // al iniciar

        // Recalcular tras navegación (por si cambia token o layout)
        this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.refreshRoleAndUser());
    }

    private refreshRoleAndUser() {
        // Mostrar acciones RRHH SOLO si el rol real es rrhh
        this.isHRView = this.tokenSrv.hasRole ? this.tokenSrv.hasRole('rrhh') : false;

        // Nombre y DNI desde tokenService
        this.userName = this.tokenSrv.getFullName ? this.tokenSrv.getFullName() : null;
        this.userDni = this.tokenSrv.getDni ? this.tokenSrv.getDni() : null;
    }

    toggleEllipsisMenu() {
        this.showEllipsisMenu = !this.showEllipsisMenu;
        if (this.showEllipsisMenu) this.showUserMenu = false;
    }

    toggleUserMenu() {
        this.showUserMenu = !this.showUserMenu;
        if (this.showUserMenu) this.showEllipsisMenu = false;
    }

    logout() {
        this.tokenSrv.clearAll();
        this.showEllipsisMenu = false;
        this.showUserMenu = false;
        this.router.navigateByUrl('/auth/login');
    }

    // Cerrar menús al hacer clic fuera
    @HostListener('document:click', ['$event'])
    onDocClick(ev: Event) {
        const el = ev.target as HTMLElement;
        const insideEllipsis = el.closest('.menu-ellipsis-container');
        const insideUser = el.closest('.menu-user-container');
        if (!insideEllipsis) this.showEllipsisMenu = false;
        if (!insideUser) this.showUserMenu = false;
    }

    // Cerrar si cambian datos de sesión en otra pestaña
    @HostListener('window:storage', ['$event'])
    onStorage() {
        this.refreshRoleAndUser();
    }

    // (Opcional) Cerrar con ESC
    @HostListener('document:keydown.escape')
    onEsc() {
        this.showEllipsisMenu = false;
        this.showUserMenu = false;
    }
}
