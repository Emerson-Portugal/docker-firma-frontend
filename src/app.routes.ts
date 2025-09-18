import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth/auth.guard';
import { roleGuard } from '@core/guards/auth/role.guard';
import { HomeViewComponent } from './app/features/home/home-view.component';

export const appRoutes: Routes = [
    { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

    {
        path: 'auth',
        title: 'Bienvenido',
        loadComponent: () => import('./app/features/auth/auth.component').then((c) => c.AuthComponent),
        children: [
            { path: '', redirectTo: 'login', pathMatch: 'full' },
            {
                path: 'login',
                loadComponent: () => import('./app/features/auth/components/login/login.component').then((m) => m.LoginComponent)
            }
        ]
    },

    {
        path: 'signature',
        canMatch: [authGuard],
        loadComponent: () => import('./app/signature/signature.component').then((c) => c.SignatureComponent),
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            { path: 'home', component: HomeViewComponent },

            // Document List - Solo RRHH
            {
                path: 'document-list',
                canMatch: [roleGuard(['rrhh'])],
                loadComponent: () => import('./app/features/maintenance/document-list/document-list.component').then((c) => c.DocumentListComponent)
            },

            // Usuarios - Solo SOPORTE
            {
                path: 'users',
                canMatch: [roleGuard(['soporte'])],
                children: [
                    {
                        path: '',
                        pathMatch: 'full',
                        redirectTo: 'list'
                    },
                    {
                        path: 'list',
                        loadComponent: () => import('./app/features/users').then((m) => m.ListUsersComponent)
                    },
                    {
                        path: 'create',
                        loadComponent: () => import('./app/features/users').then((m) => m.CreateUserComponent)
                    }
                ]
            },

            // Solo EMPLEADO
            {
                path: 'sign-ballots',
                canMatch: [roleGuard(['empleado'])],
                children: [
                    {
                        path: 'dashboard',
                        loadComponent: () => import('./app/features/maintenance/list-ballots-user/list-ballots-user.component').then((c) => c.ListBallotsUserComponent)
                    },

                    {
                        path: ':id',
                        loadComponent: () => import('./app/features/maintenance/sign-ballots/sign-ballots.component').then((c) => c.SignBallotsComponent)
                    }
                ]
            },

            // Solo RRHH
            {
                path: 'upload-ballots',
                canMatch: [roleGuard(['rrhh'])],
                children: [
                    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
                    {
                        path: 'dashboard',
                        loadComponent: () => import('./app/features/maintenance/upload-ballots/upload-ballots.component').then((c) => c.UploadBallotsComponent)
                    }
                ]
            }
        ]
    },

    { path: '**', redirectTo: 'auth/login' }
];
