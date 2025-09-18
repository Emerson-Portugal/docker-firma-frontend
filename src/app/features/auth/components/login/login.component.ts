import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../../core/services/user/user.service';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule],
  templateUrl: './login.component.html',
  styles: ``
})

export class LoginComponent {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private router = inject(Router);

  loading = false;



  loginForm: FormGroup = this.fb.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    password: ['', [Validators.required, Validators.minLength(4)]], // tu backend acepta 1234
  });

  isInvalid(ctrl: string): boolean {
    const c = this.loginForm.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    const { dni, password } = this.loginForm.value;

    this.userService.loginDni({ dni, password }).subscribe({
      next: () => {
        this.loading = false;
        // ⬅️ Ir al Home
        this.router.navigateByUrl('/signature/home'); // <- en vez de '/'
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        alert('Credenciales inválidas o error de servidor.');
      },
    });
  }
}