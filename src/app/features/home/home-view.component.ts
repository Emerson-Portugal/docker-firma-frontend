// home-view.component.ts
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CustomCardComponent } from '@shared/custom-card/custom-card.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [CommonModule, CustomCardComponent],
  templateUrl: './home-view.component.html',
})
export class HomeViewComponent {
  private readonly router = inject(Router);

  userRole: string | null = null;

  constructor() {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.userRole = parsed.rol; // "rrhh" o "empleado"
      } catch {
        this.userRole = null;
      }
    }
  }

  navigateTo(path: string): void {
    this.router.navigateByUrl(`/signature/${path}`);
  }
}
