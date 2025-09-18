import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/enviroment';

@Injectable({
  providedIn: 'root',
})

export class SessionService {
  private baseUrl: string;
  private _http: HttpClient = inject(HttpClient);

  private userSubject: BehaviorSubject<any | null> = new BehaviorSubject(null);

  constructor() {
    this.baseUrl = environment.BASE_URL;
  }

  getToken(): string  {
    return localStorage.getItem('authToken')!;
  }

  setUser(userData: any): void {
    this.userSubject.next(userData);
  }

  getUser(): Observable<any | null> {
    return this.userSubject.asObservable();
  }

  getAccountSession(token: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });

    return this._http
      .get(`${this.baseUrl}/account/getAccountSession`, { headers })
      .pipe(
        catchError((error) => {
          console.error('Error en GetAccountByUserName:', error);
          return throwError(error);
        })
      );
  }
}
