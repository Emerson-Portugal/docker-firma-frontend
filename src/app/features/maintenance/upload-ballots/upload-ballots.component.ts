import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { UploadBallotsService, UploadResponse } from '../../../core/services/ballots/upload-ballots/upload-ballots.service';

// PrimeNG
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

@Component({
    selector: 'app-upload-ballots',
    standalone: true,
    imports: [CommonModule, ButtonModule, ProgressBarModule, TableModule, ToastModule, CardModule, TagModule],
    providers: [MessageService],
    templateUrl: './upload-ballots.component.html'
})
export class UploadBallotsComponent {
    private uploadService = inject(UploadBallotsService);
    private messageService = inject(MessageService);

    selectedFiles: File[] = [];
    uploadProgress: number = 0;
    isUploading: boolean = false;
    uploadComplete: boolean = false;
    uploadResponse: UploadResponse | null = null;
    errorMessage: string = '';

    onFileSelected(event: any): void {
        const newFiles = Array.from(event.target.files || []) as File[];

        // Filtrar archivos duplicados por nombre y tamaño
        const uniqueNewFiles = newFiles.filter((newFile: File) => !this.selectedFiles.some((existingFile: File) => existingFile.name === newFile.name && existingFile.size === newFile.size));

        // Agregar solo archivos nuevos únicos
        this.selectedFiles = [...this.selectedFiles, ...uniqueNewFiles];

        // Limpiar el input para permitir seleccionar el mismo archivo nuevamente si es necesario
        event.target.value = '';

        // Mostrar mensaje si se encontraron duplicados
        if (newFiles.length > uniqueNewFiles.length) {
            const duplicateCount = newFiles.length - uniqueNewFiles.length;
            this.messageService.add({
                severity: 'warn',
                summary: 'Archivos duplicados',
                detail: `Se omitieron ${duplicateCount} archivo(s) duplicado(s).`,
                life: 3000
            });
        }
    }

    uploadFiles(): void {
        if (this.selectedFiles.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Por favor selecciona al menos un archivo',
                life: 3000
            });
            return;
        }

        this.isUploading = true;
        this.uploadProgress = 0;
        this.uploadResponse = null;

        // 🔹 Simulación fluida: sube cada 150ms hasta 95%
        const fakeProgress = setInterval(() => {
            if (this.uploadProgress < 95) {
                this.uploadProgress += 5;
            }
        }, 150);

        this.uploadService.uploadBallots(this.selectedFiles).subscribe({
            next: (event: any) => {
                if (event.type === HttpEventType.Response) {
                    clearInterval(fakeProgress);

                    // 🔹 Completar la barra
                    this.uploadProgress = 100;

                    this.uploadResponse = event.body;

                    // Mostrar mensaje con los resultados
                    const archivos_exitosos = this.uploadResponse?.archivos_exitosos ?? 0;
                    const archivos_con_error = this.uploadResponse?.archivos_con_error ?? 0;

                    // Determinar el estado del mensaje
                    let severity: 'success' | 'warn' | 'error';
                    let summary: string;

                    if (archivos_con_error === 0) {
                        // Todos los archivos se subieron correctamente
                        severity = 'success';
                        summary = 'Éxito';
                    } else if (archivos_exitosos > 0) {
                        // Algunos archivos tuvieron éxito y otros no
                        severity = 'warn';
                        summary = 'Advertencia';
                    } else {
                        // Todos los archivos fallaron
                        severity = 'error';
                        summary = 'Error';
                    }

                    this.messageService.add({
                        severity,
                        summary,
                        detail: this.getUploadResultMessage(),
                        life: 6000
                    });

                    // Resetear después de 1.5s
                    setTimeout(() => {
                        this.isUploading = false;
                        this.uploadProgress = 0;
                    }, 1500);
                }
            },
            error: (error) => {
                clearInterval(fakeProgress);
                this.uploadProgress = 0;
                this.isUploading = false;

                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error.error?.message || 'Error al subir archivos',
                    life: 6000
                });
            }
        });
    }

    removeFile(index: number): void {
        this.selectedFiles.splice(index, 1);
    }

    resetForm(): void {
        this.selectedFiles = [];
        this.uploadProgress = 0;
        this.uploadComplete = false;
        this.uploadResponse = null;
        this.errorMessage = '';
    }

    public getUploadResultMessage(): string {
        if (!this.uploadResponse) return '';

        const archivos_exitosos = this.uploadResponse.archivos_exitosos ?? 0;
        const archivos_con_error = this.uploadResponse.archivos_con_error ?? 0;
        const total = archivos_exitosos + archivos_con_error;

        let message = 'Procesamiento de archivos completado';

        if (archivos_exitosos > 0) {
            message += `\n${archivos_exitosos} de ${total} archivo(s) subidos correctamente`;
        }

        if (archivos_con_error > 0) {
            if (archivos_exitosos > 0) {
                message += '. ';
            }
            message += `\n${archivos_con_error} archivo(s) con errores.`;
        } else {
            message += '.';
        }

        return message;
    }
    home() {
        window.location.href = '/signature/home';
    }
}
