import { HttpClient, HttpEvent, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/enviroment';
import { tokenService } from '../../tokenService/token.service';

export interface UploadResult {
    archivo_original: string;
    archivo_guardado: string;
    dni: string;
    documento_id: number;
    ruta: string;
    estado: string;
}

export interface UploadResponse {
    mensaje: string;
    archivos_procesados: number;
    archivos_exitosos: number;
    archivos_con_error: number;
    resultados: UploadResult[];
    errores: any[];
}

@Injectable({
    providedIn: 'root'
})
export class UploadBallotsService {
    private apiUrl = `${environment.BASE_URL}/rrhh/rrhh/documentos/upload/lote`;
    private http = inject(HttpClient);
    private tokenService = inject(tokenService);

    private getAuthHeaders() {
        const token = this.tokenService.getToken();
        return new HttpHeaders({
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
        });
    }

    uploadBallots(files: File[]): Observable<HttpEvent<UploadResponse>> {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));

        const headers = this.getAuthHeaders();

        return this.http.post<UploadResponse>(this.apiUrl, formData, {
            headers: headers,
            reportProgress: true,
            observe: 'events'
        });
    }
}
