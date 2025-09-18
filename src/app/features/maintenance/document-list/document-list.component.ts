import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentService, Documento } from '@core/services/document/document.service';
import { LoadingComponent } from '@shared/components/loading/loading.component';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogService } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { catchError, finalize, of } from 'rxjs';

import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { environment } from '../../../../environments/enviroment';

interface EstadoFiltro {
    nombre: string;
    valor: string;
}

@Component({
    selector: 'app-document-list',
    standalone: true,
    imports: [CommonModule, TableModule, ButtonModule, CardModule, TagModule, ToastModule, InputTextModule, DatePickerModule, SelectModule, FormsModule, LoadingComponent, ConfirmDialogModule],
    templateUrl: './document-list.component.html',
    providers: [MessageService, DatePipe, ConfirmationService, DialogService]
})
export class DocumentListComponent implements OnInit {
    documentos: Documento[] = [];
    documentosFiltrados: Documento[] = [];
    loading = true;
    loadingTabla = false;
    deleting = false;

    // Años y meses disponibles
    years: number[] = [];
    availableMonths: { [year: number]: number[] } = {};

    // Meses con nombres
    months = [
        { id: 1, name: 'Enero' },
        { id: 2, name: 'Febrero' },
        { id: 3, name: 'Marzo' },
        { id: 4, name: 'Abril' },
        { id: 5, name: 'Mayo' },
        { id: 6, name: 'Junio' },
        { id: 7, name: 'Julio' },
        { id: 8, name: 'Agosto' },
        { id: 9, name: 'Septiembre' },
        { id: 10, name: 'Octubre' },
        { id: 11, name: 'Noviembre' },
        { id: 12, name: 'Diciembre' }
    ];

    // Filtros
    selectedYear: number | null = null;
    selectedMonth: number | null = null;
    showYearView = true;
    showMonthView = false;
    showDocumentView = false;

    // Filtros adicionales
    filtroUsuario: string = '';
    filtroEstado: string | null = null;

    // Opciones de estados
    estados: EstadoFiltro[] = [
        { nombre: 'Pendiente', valor: 'pendiente' },
        { nombre: 'Firmado', valor: 'firmado' }
    ];

    constructor(
        private documentService: DocumentService,
        private messageService: MessageService,
        private datePipe: DatePipe,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.cargarPeriodos();
    }

    cargarPeriodos(): void {
        this.loading = true;
        this.documentService.getDocumentPeriods().subscribe({
            next: (data) => {
                this.years = data.years.sort((a, b) => b - a); // Orden descendente
                this.availableMonths = data.months;

                // Si solo hay un año, lo seleccionamos automáticamente
                if (this.years.length === 1) {
                    this.selectYear(this.years[0]);
                }

                this.loading = false;
            },
            error: (error) => {
                console.error('Error al cargar periodos:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar los periodos disponibles.'
                });
                this.loading = false;
            }
        });
    }

    getMonthsForSelectedYear(): { id: number; name: string }[] {
        if (!this.selectedYear) return [];

        const monthsInYear = this.availableMonths[this.selectedYear] || [];
        return this.months.filter((month) => monthsInYear.includes(month.id));
    }

    selectYear(year: number): void {
        this.selectedYear = year;
        this.showYearView = false;
        this.showMonthView = true;
        this.showDocumentView = false;
    }

    selectMonth(month: number): void {
        if (!this.selectedYear) return;

        this.selectedMonth = month;
        this.showMonthView = false;
        this.showDocumentView = true;
        this.cargarDocumentos(this.selectedYear, month);
    }

    goBackToMonths(): void {
        this.showMonthView = true;
        this.showDocumentView = false;
        this.documentos = [];
        this.documentosFiltrados = [];
    }

    goBackToYears(): void {
        this.showYearView = true;
        this.showMonthView = false;
        this.showDocumentView = false;
        this.selectedYear = null;
        this.selectedMonth = null;
        this.documentos = [];
        this.documentosFiltrados = [];
    }

    cargarDocumentos(anio: number, mes: number): void {
        this.loading = true;
        this.documentService
            .getDocumentos(anio, mes)
            .pipe(
                finalize(() => (this.loading = false)),
                catchError((error) => {
                    console.error('Error al cargar documentos:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudieron cargar los documentos. Por favor, intente nuevamente.'
                    });
                    return of([]);
                })
            )
            .subscribe({
                next: (data) => {
                    if (!Array.isArray(data)) {
                        console.warn('La respuesta no es un array:', data);
                        this.documentos = [];
                        this.documentosFiltrados = [];
                        return;
                    }
                    this.documentos = data;
                    this.aplicarFiltros();
                }
            });
    }

    aplicarFiltros(): void {
        this.documentosFiltrados = this.documentos.filter((doc) => {
            // Filtrar por usuario (nombre o DNI)
            const usuarioMatch = !this.filtroUsuario || doc.nombre_usuario?.toLowerCase().includes(this.filtroUsuario.toLowerCase()) || doc.usuario_dni?.includes(this.filtroUsuario);

            // Filtrar por estado
            const estadoMatch = !this.filtroEstado || doc.estado?.toLowerCase() === this.filtroEstado.toLowerCase();

            return usuarioMatch && estadoMatch;
        });
    }

    limpiarFiltros(): void {
        this.filtroUsuario = '';
        this.filtroEstado = null;
        this.aplicarFiltros();
    }

    exportToExcel() {
        if (!this.documentosFiltrados || this.documentosFiltrados.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Sin datos',
                detail: 'No hay datos para exportar',
                life: 3000
            });
            return;
        }

        // Obtener el nombre del mes actual
        const monthName = this.selectedMonth ? this.months.find((m) => m.id === this.selectedMonth)?.name || '' : '';
        const year = this.selectedYear || new Date().getFullYear();

        // Preparar los datos
        const data = this.documentosFiltrados.map((doc) => ({
            Usuario: doc.nombre_usuario || 'N/A',
            DNI: doc.usuario_dni || 'N/A',
            Documento: doc.nombre_archivo || doc.nombre || 'N/A',
            'Subido el': this.datePipe.transform(doc.subido_en || doc.fecha_creacion, 'dd/MM/yyyy HH:mm') || 'N/A',
            Estado: (doc.estado || '').toUpperCase(),
            'Fecha de Creación': this.datePipe.transform(doc.fecha_creacion, 'dd/MM/yyyy HH:mm') || 'N/A',
            'Fecha de Firma': doc.firmado_en ? this.datePipe.transform(doc.firmado_en, 'dd/MM/yyyy HH:mm') : 'No firmado'
        }));

        // Crear libro de trabajo y hoja
        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
        const wb: XLSX.WorkBook = XLSX.utils.book_new();

        // Añadir la hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, 'Documentos');

        // Ajustar el ancho de las columnas
        const wscols = [
            { wch: 25 }, // Usuario
            { wch: 15 }, // DNI
            { wch: 35 }, // Documento
            { wch: 20 }, // Subido el
            { wch: 15 }, // Estado
            { wch: 25 }, // Fecha de Creación
            { wch: 25 } // Fecha de Firma
        ];
        ws['!cols'] = wscols;

        // Estilo para el encabezado
        const headerStyle = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '4472C4' } }, // Azul corporativo
            alignment: { horizontal: 'center' }
        };

        // Aplicar estilo al encabezado
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:G1');
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
            if (!cell) continue;
            cell.s = headerStyle;
        }

        // Generar el nombre del archivo con el mes y año
        const formattedDate = this.datePipe.transform(new Date(), 'yyyyMMdd_HHmmss');
        const fileName = `documentos_${monthName}_${year}${formattedDate ? `_${formattedDate}` : ''}.xlsx`;

        // Generar el archivo Excel
        XLSX.writeFile(wb, fileName);

        this.messageService.add({
            severity: 'success',
            summary: 'Exportación exitosa',
            detail: 'El archivo Excel se ha generado correctamente',
            life: 3000
        });
    }

    getSeverity(estado: string): string {
        if (!estado) return 'info';

        switch (estado.toLowerCase()) {
            case 'pendiente':
                return 'danger';
            case 'firmado':
                return 'success';
            case 'rechazado':
                return 'danger';
            default:
                return 'info';
        }
    }

    descargarDocumento(documento: Documento): void {
        if (!documento.ruta_archivo) {
            console.error('No se encontró la ruta del archivo');
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo encontrar el archivo para abrir.'
            });
            return;
        }

        try {
            // Normalizar la ruta del archivo
            const rutaNormalizada = documento.ruta_archivo.replace(/\\\\/g, '/');

            // Construir la URL completa
            const baseUrl = environment.BASE_URL_PDF; // Ajusta esto según tu configuración
            const urlArchivo = `${baseUrl}/${rutaNormalizada}`;

            // Extraer el nombre del archivo de la ruta
            const nombreArchivo = rutaNormalizada.split('/').pop() || 'documento';

            // Crear una nueva ventana con el título del documento
            const nuevaVentana = window.open('', '_blank');
            if (nuevaVentana) {
                // Crear un iframe para mostrar el PDF
                const iframe = document.createElement('iframe');
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
                iframe.src = urlArchivo;

                // Agregar el iframe al documento de la nueva ventana
                nuevaVentana.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${nombreArchivo}</title>
                        <style>
                            body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
                            iframe { width: 100%; height: 100%; border: none; }
                        </style>
                    </head>
                    <body>
                        ${iframe.outerHTML}
                    </body>
                    </html>
                `);
                nuevaVentana.document.close();
            }

            this.messageService.add({
                severity: 'success',
                summary: 'Archivo abierto',
                detail: `Se abrió el archivo: ${nombreArchivo}`
            });
        } catch (error) {
            console.error('Error al abrir el archivo:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo abrir el archivo.'
            });
        }
    }

    confirmarEliminacion(documento: Documento) {
        Swal.fire({
            title: '¿Estás seguro?',
            html: `
            <div class="text-lg text-gray-700">
              ¿Deseas eliminar el documento 
              <span class="font-semibold text-red-600">"${documento.nombre_archivo || documento.nombre}"</span>?
            </div>
          `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-2xl shadow-2xl p-6',
                title: 'text-2xl font-bold text-gray-800 mb-2',
                htmlContainer: 'text-lg leading-relaxed text-gray-600',
                confirmButton: 'bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg text-lg font-semibold transition-all duration-200',
                cancelButton: 'bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg text-lg font-medium transition-all duration-200 mr-2'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.eliminarDocumento(documento.id);
            }
        });
    }

    eliminarDocumento(documentoId: string) {
        this.loading = true;

        this.documentService
            .eliminarDocumento(documentoId)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: () => {
                    // actualizar lista local inmediatamente
                    this.documentos = this.documentos.filter((d) => d.id !== documentoId);
                    this.aplicarFiltros();

                    Swal.fire({
                        icon: 'success',
                        title: '¡Eliminado!',
                        text: 'El documento ha sido eliminado correctamente.',
                        confirmButtonText: 'Aceptar',
                        buttonsStyling: false,
                        customClass: {
                            popup: 'rounded-2xl shadow-lg p-6',
                            title: 'text-xl font-semibold text-green-700',
                            confirmButton: 'bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-base font-medium transition-all duration-200'
                        }
                    });
                },
                error: (error) => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: error.error?.message || 'Ocurrió un error al eliminar el documento.',
                        confirmButtonText: 'Aceptar',
                        buttonsStyling: false,
                        customClass: {
                            popup: 'rounded-2xl shadow-lg p-6',
                            title: 'text-xl font-semibold text-red-700',
                            confirmButton: 'bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-base font-medium transition-all duration-200'
                        }
                    });
                }
            });
    }

    home() {
        window.location.href = '/signature/home';
    }
}
