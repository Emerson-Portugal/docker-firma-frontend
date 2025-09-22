import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';

// IMPORT CORRECTO (con “n”): environment
import { environment } from '@environments/enviroment';

// Si tu servicio exporta su propio tipo Documento, aliaséalo para evitar conflicto:
import { DocumentService, Documento as DocumentoApi } from '@core/services/document/document.service';
import { SignBallotsService } from '@services/sign-ballots/sign-ballots.service';
import Swal from 'sweetalert2';
import { LoadingComponent } from '@/shared/components/loading/loading.component';

// Tipo de vista unificado para este componente
type DocumentoView = {
    id: number;
    nombre_archivo: string;
    ruta_archivo?: string; // siempre normalizada con '/'
    ruta?: string; // opcional, pero ya no la usaremos si hay ruta_archivo
    estado?: string;
    nombre_usuario?: string;
    subido_en?: string;
};

@Component({
    selector: 'app-sign-ballots',
    standalone: true,
    imports: [CommonModule, CardModule, ButtonModule, TagModule, ProgressBarModule, LoadingComponent],
    templateUrl: './sign-ballots.component.html',
    providers: [MessageService],
    styles: [
        `
            .viewer-frame {
                width: 100%;
                height: calc(100vh - 12rem);
                border: 1px solid var(--surface-border);
                border-radius: var(--content-border-radius);
            }
        `
    ]
})
export class SignBallotsComponent implements OnInit {
    private route = inject(ActivatedRoute);
    public router = inject(Router);
    private sanitizer = inject(DomSanitizer);
    private docSvc = inject(DocumentService);
    private msg = inject(MessageService);
    private signSrv = inject(SignBallotsService);

    documento: DocumentoView | null = null;
    pdfUrlSafe: SafeResourceUrl | null = null;
    loading = true;
    isSigning = false; // <--- estado para bloquear UI

    /** Normaliza el documento que viene del backend o del state */
    private normalizeDoc = (doc: DocumentoApi | any): DocumentoView => {
        const idNum = typeof doc?.id === 'string' ? Number(doc.id) : Number(doc?.id);
        const nombre = doc?.nombre_archivo ?? doc?.nombre ?? '';
        // Unificar ruta: prioriza ruta_archivo; si no hay, usa ruta
        const rawPath = (doc?.ruta_archivo ?? doc?.ruta ?? '').toString().replace(/\\/g, '/');

        return {
            id: idNum,
            nombre_archivo: nombre,
            ruta_archivo: rawPath || undefined,
            ruta: doc?.ruta ?? undefined,
            estado: doc?.estado ?? undefined,
            nombre_usuario: doc?.nombre_usuario ?? undefined,
            subido_en: doc?.subido_en ?? doc?.fecha_creacion ?? undefined
        };
    };

    ngOnInit(): void {
        // 1) intenta leer desde state (navegación actual o history)
        const stateDocRaw = (this.router.getCurrentNavigation()?.extras?.state as any)?.doc || (window.history.state?.doc as any);

        if (stateDocRaw) {
            this.setDocumento(this.normalizeDoc(stateDocRaw));
            return;
        }

        // 2) si no viene por state, toma el :id y consulta a la API
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!Number.isFinite(id)) {
            this.msg.add({ severity: 'warn', summary: 'Aviso', detail: 'ID inválido' });
            this.router.navigate(['/signature/sign-ballots/dashboard'], { queryParamsHandling: 'preserve' });
            return;
        }

        // Fallback: trae la lista y busca el documento por id
        // (Si tienes endpoint directo /documentos/:id, úsalo y normaliza su respuesta)
        this.docSvc.getDocumentos().subscribe({
            next: (lista) => {
                const arr = Array.isArray(lista) ? lista : [];
                const mapeados = arr.map(this.normalizeDoc);
                const found = mapeados.find((d) => d.id === id);

                if (found) {
                    this.setDocumento(found);
                } else {
                    this.loading = false;
                    this.msg.add({ severity: 'info', summary: 'Sin PDF', detail: 'No se encontró el documento.' });
                }
            },
            error: (err) => {
                this.loading = false;
                this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el documento.' });
                console.error(err);
            }
        });
    }

    private setDocumento(doc: DocumentoView) {
        this.documento = doc;

        const rawPath = doc.ruta_archivo ?? doc.ruta ?? '';
        if (!rawPath) {
            this.loading = false;
            this.pdfUrlSafe = null;
            return;
        }

        const encodedPath = rawPath.split('/').map(encodeURIComponent).join('/');
        const base = (environment.BASE_URL_PDF || '').replace(/\/+$/, ''); // sin trailing slash
        const url = `${base}/${encodedPath}#view=FitH&toolbar=1&navpanes=0`;

        // Debug útil
        console.log('[SignBallots] BASE_URL_PDF =', environment.BASE_URL_PDF);
        console.log('[SignBallots] rawPath     =', rawPath);
        console.log('[SignBallots] encodedPath =', encodedPath);
        console.log('[SignBallots] iframe URL  =', url);

        this.pdfUrlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.loading = false;
    }

    getSeverity(e?: string) {
        if (e === 'firmado') return 'success';
        if (e === 'pendiente') return 'danger';
        return 'info';
    }

    firmarDocumento(): void {
        // Evita doble clic si ya está en curso
        if (this.isSigning) return;

        // Obtener el ID desde los params de ruta (robusto ante query params)
        let documentoId = Number(this.route.snapshot.paramMap.get('id'));
        // Fallback por si acaso
        if (!documentoId || Number.isNaN(documentoId)) {
            const lastSegment = this.router.url.split('/').filter(Boolean).pop() || '';
            documentoId = Number((lastSegment.split('?')[0] || '').trim());
        }

        if (!documentoId || Number.isNaN(documentoId)) {
            Swal.fire('Sin ID', 'No se encontró el ID del documento en la URL.', 'error');
            return;
        }

        this.isSigning = true;

        // Loader con SweetAlert2
        Swal.fire({
            title: 'Firmando PDF',
            html: 'Esto puede tardar unos segundos…',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading()
        });

        this.signSrv.sign(documentoId).subscribe({
            next: () => {
                this.isSigning = false;
                Swal.close(); // cierra el loader

                // Actualizar el estado del documento localmente
                if (this.documento) {
                    this.documento.estado = 'firmado';
                }

                // Mostrar mensaje de éxito y redirigir
                Swal.fire({
                    title: '¡Firmado!',
                    text: 'Documento firmado correctamente.',
                    icon: 'success',
                    confirmButtonText: 'Aceptar',
                    allowOutsideClick: false
                }).then((result) => {
                    // Redirigir al dashboard después de hacer clic en Aceptar
                    this.router.navigate(['/signature/sign-ballots/dashboard'], { queryParamsHandling: 'preserve' });
                });
            },
            error: (err) => {
                this.isSigning = false;
                Swal.close(); // cierra el loader
                if (this.signSrv.isPrevUnsignedError(err)) {
                    const prev = err.error.detail.documento_anterior;
                    Swal.fire('Firma bloqueada', `Debes firmar primero: ${prev.nombre} (fecha: ${prev.fecha}).`, 'warning');
                } else {
                    const msg = this.signSrv.readableError(err);
                    Swal.fire('Error al firmar', msg, 'error');
                }
            }
        });
    }

    home(): void {
        this.router.navigate(['/signature/sign-ballots/dashboard'], { queryParamsHandling: 'preserve' });
    }
}
