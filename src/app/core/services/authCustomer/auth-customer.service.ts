import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/enviroment';
import { tokenService } from '../tokenService/token.service';   // ✅


export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  user: {
    id: number;
    dni: string;
    nombre: string;
    email: string;
    rol: string;
    activo: boolean;
    creado_en: string;
  };
}



@Injectable({
  providedIn: 'root',
})
export class AuthCustomerService {
  private baseUrl = environment.BASE_URL;
  private _http: HttpClient = inject(HttpClient);
  private tokenService: tokenService = inject(tokenService);   // ✅

  /* ----------------------------------------------------------------
   * 🔐 Helpers
   * ---------------------------------------------------------------- */
  /** Devuelve los headers con “Content‑Type” y token (si existe). */
  private jsonAuthHeaders(): HttpHeaders {
    return this.tokenService.getAuthHeaders().set(
      'Content-Type',
      'application/json'
    );
  }

  /** 🔑 Login por DNI contra /auth/auth/login */
  loginDni(body: { dni: string; password: string }) {
    return this._http.post<LoginResponse>(
      `${this.baseUrl}/auth/auth/login`,
      body,
      {
        // En login NO necesitamos Authorization
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    ).pipe(catchError((err) => throwError(() => err)));
  }


}
