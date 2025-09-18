import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/enviroment';
import { AuthCustomerService, LoginResponse } from '../authCustomer/auth-customer.service';
import { SessionService } from '../session-service/session.service';
import { tokenService } from '../tokenService/token.service';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private userSubject = new BehaviorSubject<any>(null);
    public sessionChange = new BehaviorSubject<any>(null);
    public user$: Observable<any> = this.userSubject.asObservable();

    private baseUrl: string;
    private _http: HttpClient = inject(HttpClient);

    constructor(
        private authService: AuthCustomerService,
        private sessionService: SessionService,
        private tokenService: tokenService
    ) {
        this.baseUrl = environment.BASE_URL;
        this.loadUserSession();
    }

    /** ✅ Login para tu backend (DNI + password) */
    loginDni(credentials: { dni: string; password: string }): Observable<any> {
        return new Observable((observer) => {
            this.authService.loginDni(credentials).subscribe(
                (res: LoginResponse) => {
                    const token = res.access_token;

                    // Decodificar exp del JWT (en segundos unix)
                    const exp = (() => {
                        try {
                            const payload = JSON.parse(atob(token.split('.')[1]));
                            return typeof payload?.exp === 'number' ? payload.exp : undefined;
                        } catch {
                            return undefined;
                        }
                    })();

                    // Calcular expiresIn para tokenService (segundos restantes)
                    const nowSec = Math.floor(Date.now() / 1000);
                    const expiresIn = exp ? Math.max(exp - nowSec, 1) : undefined;

                    // Guardar token + expiración + usuario en storage
                    this.tokenService.setToken(token, expiresIn); // ← importante para que no lo borre
                    this.tokenService.setUser(res.user);

                    // Actualizar estado en memoria
                    this.userSubject.next(res.user);
                    this.sessionService.setUser(res.user);
                    this.sessionChange.next(true);

                    observer.next(res.user);
                    observer.complete();
                },
                (error) => observer.error(this.formatError(error))
            );
        });
    }

    private loadUserSession() {
        const token = this.tokenService.getToken();
        const user = this.tokenService.getUser();

        if (token && user) {
            this.userSubject.next(user);
            this.sessionService.setUser(user);
        } else if (token) {
            this.sessionService.getAccountSession(token).subscribe(
                (res: any) => {
                    if (res.isSuccess) {
                        const userData = res.data;
                        this.sessionService.setUser(userData);
                        this.userSubject.next(userData);
                        this.tokenService.setUser(userData);
                    } else {
                        this.logout(); // 🔴 Token inválido
                    }
                },
                (error) => {
                    console.log('No se pudo cargar la sesión:', error);
                    this.logout(); // 🔴 Error al validar token
                }
            );
        } else {
            this.logout(); // 🔴 No hay token ni usuario → cerrar sesión
        }
    }

    getUser(): Observable<any> {
        return this.user$;
    }

    logout() {
        console.log('Ejecutando logout...');
        this.tokenService.clearAll();
        this.userSubject.next(null);
        this.clearSession();
    }

    clearSession() {
        this.sessionService.setUser(null);
    }

    private formatError(error: any): string[] {
        if (error.error?.messages?.length > 0) {
            return error.error.messages.map((err: any) => err.description);
        }
        return ['Ocurrió un error inesperado.'];
    }

    CreateAccount(account: any) {
        const headers = this.tokenService.getAuthHeaders();

        return this._http.post(`${this.baseUrl}/account`, account, { headers }).pipe(catchError((error) => throwError(error)));
    }

    GetAccountAll(filters?: { Name: string; Email: string; Page: number; PageSize: number }) {
        const headers = this.tokenService.getAuthHeaders();

        let params = new HttpParams();
        Object.entries(filters || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params = params.set(key, value.toString());
            }
        });

        return this._http.get(`${this.baseUrl}/account/GetAccountAll`, { headers, params }).pipe(catchError((error) => throwError(error)));
    }

    GetAccountByUserName(userName: string) {
        const headers = this.tokenService.getAuthHeaders();
        const params = new HttpParams().set('userName', userName);

        return this._http
            .get(`${this.baseUrl}/account/GetAccountByUserName`, {
                headers,
                params
            })
            .pipe(catchError((error) => throwError(error)));
    }

    SendMailAccountActivate(userName: string) {
        const headers = this.tokenService.getAuthHeaders();

        return this._http.patch(`${this.baseUrl}/account/${userName}/sendmail`, null, { headers }).pipe(catchError((error) => throwError(error)));
    }

    ViewAdvertisement(code: string, body: any) {
        const headers = this.tokenService.getAuthHeaders();

        return this._http.put(`${this.baseUrl}/advertisement/${code}/view`, body, { headers }).pipe(catchError((error) => throwError(error)));
    }

    WhatsappAdvertisement(code: string) {
        const headers = this.tokenService.getAuthHeaders();

        return this._http.put(`${this.baseUrl}/advertisement/${code}/whatsapp`, {}, { headers }).pipe(catchError((error) => throwError(error)));
    }

    async convertImageToBase64(url: string): Promise<string> {
        const blob = await this._http.get(url, { responseType: 'blob' }).toPromise();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob!);
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = (error) => reject(error);
        });
    }

    updateAccount(username: string, account: any) {
        const headers = this.tokenService.getAuthHeaders();

        return this._http.put(`${this.baseUrl}/account/${username}`, account, { headers }).pipe(catchError((error) => throwError(error)));
    }
}

export interface CreateUserData {
    dni: string;
    nombre: string;
    email: string;
    rol: 'empleado' | 'rrhh' | 'soporte';
    activo: boolean;
    password: string;
}

export interface UserResponse {
    id: number;
    dni: string;
    nombre: string;
    email: string;
    rol: string;
    activo: boolean;
    creado_en: string;
}

export interface UserListResponse {
    data: UserResponse[];
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class SupportUserService {
    // Remove the /api/v1 prefix since it's already included in environment.BASE_URL
    private apiUrl = `${environment.BASE_URL}/soporte/usuarios`;
    private http: HttpClient = inject(HttpClient);
    private tokenService: tokenService = inject(tokenService);

    private getAuthHeaders() {
        const token = this.tokenService.getToken();
        return new HttpHeaders({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application'
        });
    }

    listUsers(skip: number = 0, limit: number = 10): Observable<UserListResponse> {
        const params = new HttpParams().set('skip', skip.toString()).set('limit', limit.toString());

        console.log('Fetching users from:', this.apiUrl);
        console.log('With params:', { skip, limit });

        return this.http
            .get<UserResponse[]>(this.apiUrl, {
                headers: this.getAuthHeaders(),
                params
            })
            .pipe(
                map((users: UserResponse[]) => ({
                    data: users,
                    total: users.length // This might need adjustment if the API provides total count separately
                })),
                tap((response) => {
                    console.log('Mapped response:', response);
                    return response;
                }),
                catchError((error) => {
                    console.error('Error fetching users:', error);
                    return throwError(() => error);
                })
            );
    }

    createUser(userData: CreateUserData): Observable<UserResponse> {
        return this.http.post<UserResponse>(this.apiUrl, userData, {
            headers: this.getAuthHeaders()
        });
    }
}

@Injectable({
    providedIn: 'root'
})
export class NewUserService {
    private readonly apiUrl = `${environment.BASE_URL}/soporte/usuarios`;
    private http = inject(HttpClient);
    private tokenService = inject(tokenService);

    private getAuthHeaders() {
        const token = this.tokenService.getToken();
        return new HttpHeaders({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
        });
    }

    createUser(userData: CreateUserData): Observable<UserResponse> {
        return this.http.post<UserResponse>(this.apiUrl, userData, { headers: this.getAuthHeaders() });
    }
}
