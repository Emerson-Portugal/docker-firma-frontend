import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SupportUserService, UserListResponse, UserResponse } from '@core/services/user/user.service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

@Component({
    selector: 'app-list-users',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, TableModule, CardModule, InputTextModule, RippleModule, TagModule, SkeletonModule],
    templateUrl: './list-users.component.html'
})
export class ListUsersComponent implements OnInit {
    users: UserResponse[] = [];
    loading = true;
    totalRecords = 0;
    rows = 10;
    first = 0;
    searchTerm = '';

    constructor(private userService: SupportUserService) {}

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.loading = true;
        const skip = this.first;
        const limit = this.rows;

        console.log('Loading users with skip:', skip, 'limit:', limit);

        this.userService.listUsers(skip, limit).subscribe({
            next: (response: UserListResponse) => {
                console.log('Users loaded:', response);
                this.users = response.data;
                this.totalRecords = response.total;
                this.loading = false;
            },
            error: (error: any) => {
                console.error('Error loading users:', error);
                this.loading = false;
            }
        });
    }

    onPageChange(event: TableLazyLoadEvent) {
        this.first = event.first || 0;
        this.rows = event.rows || 10;
        this.loadUsers();
    }

    getSeverity(estado: boolean): string {
        return estado ? 'success' : 'danger';
    }

    getStatusLabel(estado: boolean): string {
        return estado ? 'Activo' : 'Inactivo';
    }

    getRoleLabel(rol: string): string {
        switch (rol) {
            case 'empleado':
                return 'Empleado';
            case 'rrhh':
                return 'RRHH';
            case 'soporte':
                return 'Soporte';
            default:
                return rol;
        }
    }
}
