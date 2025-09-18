import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CreateUserData, SupportUserService, UserResponse } from '@core/services/user/user.service';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import Swal from 'sweetalert2';

interface UserRole {
    label: string;
    value: 'empleado' | 'rrhh' | 'soporte';
}

@Component({
    selector: 'app-create-user',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, CardModule, ButtonModule, InputTextModule, SelectModule, CheckboxModule, ToastModule],
    templateUrl: './create-user.component.html',
    providers: [MessageService]
})
export class CreateUserComponent {
    private fb = inject(FormBuilder);
    private userService = inject(SupportUserService);
    private messageService = inject(MessageService);
    private router = inject(Router);

    roles: UserRole[] = [
        { label: 'Empleado', value: 'empleado' },
        { label: 'RRHH', value: 'rrhh' },
        { label: 'Soporte', value: 'soporte' }
    ];

    userForm: FormGroup = this.fb.group({
        dni: ['', [Validators.required, Validators.pattern('^[0-9]{8,12}$')]],
        nombre: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        rol: ['empleado' as const, [Validators.required]],
        activo: [true],
        password: ['', [Validators.required, Validators.minLength(8)]]
    });

    loading = false;

    private showErrorAlert(title: string, message: string) {
        Swal.fire({
            title,
            text: message,
            icon: 'error',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#3B82F6'
        });
    }

    private showSuccessAlert(message: string) {
        Swal.fire({
            title: '¡Éxito!',
            text: message,
            icon: 'success',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#10B981'
        });
    }

    onSubmit() {
        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            return;
        }

        this.loading = true;
        const userData: CreateUserData = this.userForm.value;

        const subscription = this.userService.createUser(userData).subscribe({
            next: (response: UserResponse) => {
                this.showSuccessAlert('Usuario creado correctamente');
                this.userForm.reset({ rol: 'empleado', activo: true });
            },
            error: (error: any) => {
                console.error('Error al crear usuario:', error);

                let errorMessage = 'Ha ocurrido un error inesperado';

                if (error.status === 0) {
                    errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
                } else if (error.status === 400) {
                    errorMessage = error.error?.message || 'Datos inválidos. Por favor, verifica la información ingresada.';
                } else if (error.status === 401 || error.status === 403) {
                    errorMessage = 'No tienes permisos para realizar esta acción';
                } else if (error.status === 404) {
                    errorMessage = 'Recurso no encontrado';
                } else if (error.status >= 500) {
                    errorMessage = 'Error en el servidor. Por favor, inténtalo más tarde.';
                }

                if (error.error?.errors) {
                    const validationErrors = Object.values(error.error.errors).flat().join('\n');
                    this.showErrorAlert('Error de validación', validationErrors);
                } else {
                    this.showErrorAlert('Error', errorMessage);
                }
            }
        });

        subscription.add(() => {
            this.loading = false;
        });
    }

    onCancel() {
        this.router.navigate(['/signature']);
    }
}
