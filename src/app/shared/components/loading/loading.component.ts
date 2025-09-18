import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-loading',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="loading-overlay" [class.active]="isLoading">
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p class="loading-text" *ngIf="message">{{ message }}</p>
            </div>
        </div>
    `,
    styles: [
        `
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1100;
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s ease-in-out;
                backdrop-filter: blur(2px);
            }

            .loading-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            .loading-content {
                background: white;
                padding: 1.5rem 2rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.75rem;
            }

            .loading-spinner {
                width: 24px;
                height: 24px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid var(--primary-color);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            .loading-text {
                margin: 0;
                color: var(--text-color);
                font-weight: 500;
                font-size: 0.9375rem;
            }

            @keyframes spin {
                0% {
                    transform: rotate(0deg);
                }
                100% {
                    transform: rotate(360deg);
                }
            }
        `
    ]
})
export class LoadingComponent {
    @Input() isLoading: boolean = false;
    @Input() message: string = 'Cargando...';
}
