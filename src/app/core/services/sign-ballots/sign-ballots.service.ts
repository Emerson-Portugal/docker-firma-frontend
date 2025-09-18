import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
// Ajusta esta ruta según tu alias real:
import { environment } from '@environments/enviroment';
import { tokenService } from '@services/tokenService/token.service'; // ajusta la ruta

export interface DocumentoAnterior {
  id: number;
  nombre: string;
  fecha: string; // ej. "07/09/2025"
}

export interface SignErrorDetail {
  error: string; // "documento_anterior_sin_firmar" u otros
  mensaje: string;
  documento_anterior?: DocumentoAnterior;
}

export interface SignErrorResponse {
  detail: SignErrorDetail;
}

export type SignSuccessResponse = unknown;

@Injectable({ providedIn: 'root' })
export class SignBallotsService {
  private http = inject(HttpClient);
  private tokenSrv = inject(tokenService);

  /**
   * Firma un documento por su ID: POST /empleado/firmar/{documentoId}
   */
  sign(documentoId: number): Observable<SignSuccessResponse> {
    const url = `${environment.BASE_URL}/empleado/firmar/${documentoId}`;
    return this.http.post<SignSuccessResponse>(url, {}, { headers: this.authHeaders() })
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

  /**
   * Devuelve true si el error es "documento_anterior_sin_firmar".
   */
  isPrevUnsignedError(err: any): err is HttpErrorResponse & { error: SignErrorResponse } {
    return (
      err instanceof HttpErrorResponse &&
      err.status === 400 &&
      !!err.error?.detail?.error &&
      err.error.detail.error === 'documento_anterior_sin_firmar'
    );
  }

  /**
   * Extrae un mensaje legible desde el error HTTP.
   */
  readableError(err: any): string {
    if (err?.error?.detail?.mensaje) return err.error.detail.mensaje as string;
    if (typeof err?.error === 'string') return err.error as string;
    return 'El documento ya ha sido firmado previamente.';
  }

  // ================== Helpers ==================

  private authHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ Accept: 'application/json' });
    const token = this.tokenSrv.getToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }
}
