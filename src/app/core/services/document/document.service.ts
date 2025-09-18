import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/enviroment';
import { tokenService } from '../tokenService/token.service';

export interface Documento {
    id: string;
    nombre: string;
    fecha_creacion: string;
    estado: string;
    ruta_archivo: string;
    nombre_usuario: string;
    usuario_dni?: string;
    // Campos adicionales de la API
    usuario_id?: number;
    nombre_archivo?: string;
    ruta?: string;
    subido_en?: string;
    firmado_en?: string | null;
    url_descarga?: string;
    usuario?: {
        id: number;
        nombre: string;
        dni: string;
    };
}

export interface DocumentPeriods {
    years: number[];
    months: { [year: number]: number[] };
}

@Injectable({
    providedIn: 'root'
})
export class DocumentService {
    private apiUrl = `${environment.BASE_URL}/rrhh/rrhh/documentos`;
    private http = inject(HttpClient);
    private tokenService = inject(tokenService);

    private getAuthHeaders() {
        const token = this.tokenService.getToken();
        return new HttpHeaders({
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
        });
    }

    getDocumentos(anio?: number, mes?: number): Observable<Documento[]> {
        const headers = this.getAuthHeaders();
        let params: any = {};

        if (anio) {
            params.anio = anio.toString();

            if (mes) {
                params.mes = mes.toString();
            }
        }

        return this.http
            .get<any>(this.apiUrl, {
                headers,
                params
            })
            .pipe(
                map((response) => {
                    // Verificar si la respuesta tiene la propiedad 'documentos' y es un array
                    if (response && Array.isArray(response.documentos)) {
                        return response.documentos.map((doc: any) => ({
                            id: doc.id.toString(),
                            nombre: doc.nombre_archivo || doc.nombre,
                            fecha_creacion: doc.subido_en || doc.fecha_creacion,
                            estado: doc.estado,
                            ruta_archivo: doc.ruta_archivo || doc.ruta,
                            nombre_usuario: doc.nombre_usuario || (doc.usuario ? doc.usuario.nombre : ''),
                            usuario_dni: doc.usuario_dni || (doc.usuario ? doc.usuario.dni : ''),
                            subido_en: doc.subido_en,
                            firmado_en: doc.firmado_en,
                            url_descarga: doc.url_descarga
                        }));
                    }
                    console.warn('La respuesta de la API no contiene un array de documentos:', response);
                    return [];
                })
            );
    }

    getDocumentoPorId(id: string): Observable<Documento> {
        const headers = this.getAuthHeaders();
        return this.http.get<Documento>(`${this.apiUrl}/${id}`, { headers });
    }

    eliminarDocumento(id: string): Observable<any> {
        const headers = this.getAuthHeaders();
        return this.http.delete(`${this.apiUrl}/${id}`, {
            headers,
            responseType: 'json'
        });
    }

    getDocumentPeriods(): Observable<DocumentPeriods> {
        const headers = this.getAuthHeaders();
        return this.http.get<DocumentPeriods>(`${this.apiUrl}/periodos`, { headers });
    }
}
