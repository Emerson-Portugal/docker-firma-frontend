import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DataViewModule } from 'primeng/dataview';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';

import { Router } from '@angular/router';
import { ListBallotsService } from '@services/list-ballots/list-ballots.service';
import { StatusBallotsService } from '@services/status-ballots/status-ballots.service';
import { LoadingComponent } from '@shared/components/loading/loading.component';
import Swal from 'sweetalert2';

interface Documento {
    id: number;
    nombre_archivo: string;
    ruta: string;
    estado: string;
    subido_en: string;
    firmado_en: string | null;
    nombre_usuario: string;
}

interface MisDocumentosResponse {
    message: string;
    documentos: Documento[];
    usuario_actual: { id: number; nombre: string; dni: string; rol: string };
}

@Component({
    selector: 'app-list-ballots-user',
    standalone: true,
    imports: [CommonModule, FormsModule, DataViewModule, SelectButtonModule, TagModule, ButtonModule, LoadingComponent, SelectModule],
    providers: [MessageService],
    templateUrl: './list-ballots-user.component.html'
})
export class ListBallotsUserComponent implements OnInit {
    loading = false;
    error: string | null = null;

    documentos: Documento[] = [];
    documentosFiltrados: Documento[] = [];
    validando: { [key: number]: boolean } = {};

    // Filtros
    estadoFiltro: 'all' | 'pendiente' | 'firmado' = 'all';
    mesFiltro: number | null = null;
    ordenarPor: 'recientes' | 'antiguos' = 'recientes';

    // Opciones para los filtros
    estadoOptions = [
        { label: 'Todos', value: 'all' },
        { label: 'Pendiente', value: 'pendiente' },
        { label: 'Firmado', value: 'firmado' }
    ];

    opcionesOrden = [
        { label: 'Más recientes primero', value: 'recientes' },
        { label: 'Más antiguos primero', value: 'antiguos' }
    ];

    meses = [
        { label: 'Enero', value: 1 },
        { label: 'Febrero', value: 2 },
        { label: 'Marzo', value: 3 },
        { label: 'Abril', value: 4 },
        { label: 'Mayo', value: 5 },
        { label: 'Junio', value: 6 },
        { label: 'Julio', value: 7 },
        { label: 'Agosto', value: 8 },
        { label: 'Septiembre', value: 9 },
        { label: 'Octubre', value: 10 },
        { label: 'Noviembre', value: 11 },
        { label: 'Diciembre', value: 12 }
    ];

    // Paginación
    rows = 10;
    first = 0;

    constructor(
        private listSvc: ListBallotsService,
        private signSts: StatusBallotsService,
        private router: Router,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.loading = true;
        this.error = null;
        this.listSvc.getMyDocuments().subscribe({
            next: (res: MisDocumentosResponse) => {
                this.documentos = res.documentos ?? [];
                this.aplicarFiltros(); // <- aplicar filtro inicial
                this.loading = false;
            },
            error: (err) => {
                this.error = err?.error?.detail || 'No se pudieron cargar los documentos.';
                this.documentos = [];
                this.documentosFiltrados = [];
                this.loading = false;
            }
        });
    }

    limpiarFiltros() {
        this.estadoFiltro = 'all';
        this.mesFiltro = null;
        this.ordenarPor = 'recientes';
        this.first = 0;
        this.aplicarFiltros();
    }

    aplicarFiltros() {
        // Aplicar filtros
        let documentosFiltrados = this.documentos.filter((doc) => {
            // Filtrar por estado
            const cumpleEstado = this.estadoFiltro === 'all' || (doc.estado || '').toLowerCase() === this.estadoFiltro;

            // Filtrar por mes
            let cumpleMes = true;
            if (this.mesFiltro) {
                const fechaDoc = new Date(doc.subido_en);
                cumpleMes = fechaDoc.getMonth() + 1 === this.mesFiltro;
            }

            return cumpleEstado && cumpleMes;
        });

        // Ordenar según la opción seleccionada
        documentosFiltrados.sort((a, b) => {
            const fechaA = new Date(a.subido_en).getTime();
            const fechaB = new Date(b.subido_en).getTime();
            return this.ordenarPor === 'recientes' ? fechaB - fechaA : fechaA - fechaB;
        });

        this.documentosFiltrados = documentosFiltrados;
    }

    getSeverity(estado: string): 'success' | 'warning' | 'danger' | 'info' {
        const e = (estado || '').toLowerCase();
        if (e === 'firmado') return 'success';
        if (e === 'pendiente') return 'danger'; // tu elección previa
        return 'info';
    }

    trackDoc = (_: number, d: Documento) => d.id;

    async descargar(doc: Documento) {
        this.validando[doc.id] = true;
        try {
            // Verificar si se puede firmar el documento
            const response = await this.signSts.verificarFirma(doc.id).toPromise();

            if (response?.puede_firmar) {
                // Si puede firmar, redirigir a la firma
                this.router.navigate(['/signature/sign-ballots', doc.id], { state: { doc } });
            } else {
                // Si hay documentos pendientes, mostrar mensaje
                const docPendiente = response?.documento_pendiente;
                const mensaje = docPendiente ? `Tienes el documento "${docPendiente.nombre}" (${docPendiente.fecha}) pendiente de firmar.` : 'Tienes documentos pendientes de firmar.';

                await Swal.fire({
                    title: 'Documentos pendientes',
                    html: `${mensaje}<br>Por favor, fírmalos en orden cronológico.`,
                    icon: 'warning',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#3085d6',
                    showCloseButton: true
                });
            }
        } catch (error: any) {
            console.error('Error al verificar documentos:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Ocurrió un error al verificar el estado del documento',
                life: 5000
            });
        } finally {
            this.validando[doc.id] = false;
        }
    }

    verDocumento(doc: Documento) {
        // Redirigir directamente a la vista del documento sin validación
        this.router.navigate(['/signature/sign-ballots', doc.id], { state: { doc } });
    }

    home() {
        window.location.href = '/signature/home';
    }
}
