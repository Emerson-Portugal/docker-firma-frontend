// src/app/services/status-ballots.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/enviroment';
import { tokenService } from '@services/tokenService/token.service';

export interface DocumentoPendiente {
  id: number;
  nombre: string;
  fecha: string;
}

export interface VerificacionFirmaResponse {
  puede_firmar: boolean;
  mensaje: string;
  documento_pendiente: DocumentoPendiente | null;
}

@Injectable({
  providedIn: 'root'
})
export class StatusBallotsService {
  private apiUrl = `${environment.BASE_URL}/empleado/verificar-firma`;

  constructor(private http: HttpClient, private tokenSrv: tokenService) {}

  // =============== Helpers ====================
  private authHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ Accept: 'application/json' });
    const token = this.tokenSrv.getToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // =============== Método principal ============
  verificarFirma(documentoId: number): Observable<VerificacionFirmaResponse> {
    return this.http.get<VerificacionFirmaResponse>(
      `${this.apiUrl}/${documentoId}`,
      { headers: this.authHeaders() }
    );
  }
}
