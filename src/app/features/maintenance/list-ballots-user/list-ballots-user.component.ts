import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DataViewModule } from 'primeng/dataview';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';

import { Router, ActivatedRoute } from '@angular/router';
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

    years: number[] = [];
    selectedYear: number | null = null;
    showYearView = true;
    showDocumentView = false;

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

    // --- Helpers de periodo (mes/año) basado en el nombre del archivo ---
    private extraerPeriodoDeNombre(nombreArchivo?: string | null): { year: number; month: number } | null {
        if (!nombreArchivo) return null;
        // Considerar meses en español (con y sin acento) y variante Setiembre
        const meses = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'setiembre', 'octubre', 'noviembre', 'diciembre'
        ];

        // Quitar acentos para comparar
        const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const nombre = normalize(nombreArchivo);

        // Buscar nombre de mes y año de 4 dígitos cercanos
        // Ejemplos válidos: "Boleta_Septiembre_2025.pdf", "septiembre-2025", "2025_septiembre"
        const mesRegex = new RegExp(`\\b(${meses.map(m => normalize(m)).join('|')})\\b`, 'i');
        const yearRegex = /(19|20)\d{2}/; // años 1900-2099

        const mesMatch = nombre.match(mesRegex);
        const yearMatch = nombre.match(yearRegex);
        if (!mesMatch || !yearMatch) return null;

        let mesName = mesMatch[1];
        // Mapear setiembre->septiembre por consistencia
        if (mesName === 'setiembre') mesName = 'septiembre';

        const monthIndex = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ].indexOf(mesName);
        if (monthIndex === -1) return null;

        const year = Number(yearMatch[0]);
        const month = monthIndex + 1; // 1-12
        return { year, month };
    }

    private getFechaPeriodo(doc: Documento): Date | null {
        const periodo = this.extraerPeriodoDeNombre(doc.nombre_archivo);
        if (periodo) {
            // Construir fecha del primer día del mes a medianoche para ordenar
            return new Date(periodo.year, periodo.month - 1, 1);
        }
        return null;
    }

    constructor(
        private listSvc: ListBallotsService,
        private signSts: StatusBallotsService,
        private router: Router,
        private route: ActivatedRoute,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        // Leer el query param 'year' para mantener el contexto del año seleccionado
        this.route.queryParams.subscribe((params) => {
            const yearParam = params['year'];
            const yearNum = yearParam ? Number(yearParam) : null;
            if (yearNum && !Number.isNaN(yearNum)) {
                this.selectedYear = yearNum;
                this.showYearView = false;
                this.showDocumentView = true;
            } else {
                this.selectedYear = null;
                this.showYearView = true;
                this.showDocumentView = false;
            }
            // Reaplicar filtros cuando cambia el query param
            this.aplicarFiltros();
        });

        this.cargar();
    }

    cargar(): void {
        this.loading = true;
        this.error = null;
        this.listSvc.getMyDocuments().subscribe({
            next: (res: MisDocumentosResponse) => {
                this.documentos = res.documentos ?? [];

                // Generar años únicos a partir del periodo del documento (por nombre). Fallback: subido_en
                const años = new Set<number>();
                this.documentos.forEach((doc) => {
                    const periodo = this.extraerPeriodoDeNombre(doc.nombre_archivo);
                    if (periodo) {
                        años.add(periodo.year);
                    } else if (doc.subido_en) {
                        const y = new Date(doc.subido_en).getFullYear();
                        if (!Number.isNaN(y)) años.add(y);
                    }
                });

                // Orden descendente (últimos años primero)
                this.years = Array.from(años).sort((a, b) => b - a);

                this.aplicarFiltros();
                this.loading = false;
            },
            error: (err) => {
                this.error = err?.error?.detail || 'No se pudieron cargar los documentos.';
                this.documentos = [];
                this.documentosFiltrados = [];
                this.years = [];
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
        let documentosFiltrados = this.documentos.filter((doc) => {
            // Filtrar por estado
            const cumpleEstado =
                this.estadoFiltro === 'all' ||
                (doc.estado || '').toLowerCase() === this.estadoFiltro;

            // Obtener periodo del documento por nombre (preferente)
            const periodo = this.extraerPeriodoDeNombre(doc.nombre_archivo);

            // Filtrar por mes del documento
            let cumpleMes = true;
            if (this.mesFiltro) {
                if (periodo) {
                    cumpleMes = periodo.month === this.mesFiltro;
                } else if (doc.subido_en) {
                    const fechaDoc = new Date(doc.subido_en);
                    cumpleMes = fechaDoc.getMonth() + 1 === this.mesFiltro;
                } else {
                    cumpleMes = false;
                }
            }

            // Filtrar por año del documento
            let cumpleAnio = true;
            if (this.selectedYear) {
                if (periodo) {
                    cumpleAnio = periodo.year === this.selectedYear;
                } else if (doc.subido_en) {
                    const fechaDoc = new Date(doc.subido_en);
                    cumpleAnio = fechaDoc.getFullYear() === this.selectedYear;
                } else {
                    cumpleAnio = false;
                }
            }

            return cumpleEstado && cumpleMes && cumpleAnio;
        });

        // Ordenar según la opción seleccionada usando primero el periodo del documento
        documentosFiltrados.sort((a, b) => {
            const fa = this.getFechaPeriodo(a)?.getTime() ?? (a.subido_en ? new Date(a.subido_en).getTime() : 0);
            const fb = this.getFechaPeriodo(b)?.getTime() ?? (b.subido_en ? new Date(b.subido_en).getTime() : 0);
            return this.ordenarPor === 'recientes' ? fb - fa : fa - fb;
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

    selectYear(year: number) {
        this.selectedYear = year;
        this.showYearView = false;
        this.showDocumentView = true;
        this.aplicarFiltros();
        // Reflejar la selección en la URL para poder restaurarla después
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { year },
            queryParamsHandling: 'merge'
        });
    }

    goBackToYears() {
        this.selectedYear = null;
        this.showYearView = true;
        this.showDocumentView = false;
        this.aplicarFiltros();
        // Quitar el año de la URL
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { year: null },
            queryParamsHandling: 'merge'
        });
    }

    async descargar(doc: Documento) {
        this.validando[doc.id] = true;
        try {
            // Verificar si se puede firmar el documento
            const response = await this.signSts.verificarFirma(doc.id).toPromise();

            if (response?.puede_firmar) {
                // Si puede firmar, redirigir a la firma preservando el año seleccionado en query params
                this.router.navigate(['/signature/sign-ballots', doc.id], {
                    state: { doc },
                    queryParamsHandling: 'preserve'
                });
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
        this.router.navigate(['/signature/sign-ballots', doc.id], {
            state: { doc },
            queryParamsHandling: 'preserve'
        });
    }

    home() {
        window.location.href = '/signature/home';
    }
}
