// src/app/core/services/list-ballots.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/enviroment';
import { MisDocumentosResponse } from '../../models/documentos.model';
import { tokenService } from '../tokenService/token.service';


@Injectable({ providedIn: 'root' })
export class ListBallotsService {
  private apiUrl = `${environment.BASE_URL}/empleado/mis-documentos`;
  private http = inject(HttpClient);
  private tokenService = inject(tokenService);

  private getAuthHeaders() {
    const token = this.tokenService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });
  }



  /** Ajusta aquí cómo guardas el token. Soporta varias claves comunes. */
  private getToken(): string | null {
    const direct =  localStorage.getItem('authToken');
    if (direct) return direct;

    // Si tu app guarda un objeto "user" con token dentro:
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        return u?.token || u?.access_token || null;
      } catch {
        return null;
      }
    }
    return null;
    // Si quieres forzar un token fijo de pruebas, descomenta:
    // return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
  }

  getMyDocuments(): Observable<MisDocumentosResponse> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    return this.http
      .get<MisDocumentosResponse>(`${this.apiUrl}`, { headers })
      .pipe(
        catchError((err) => {
          console.error('Error al obtener documentos', err);
          return throwError(() => err);
        })
      );
  }
}
