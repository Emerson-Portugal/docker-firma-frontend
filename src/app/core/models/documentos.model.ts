export interface Documento {
  id: number;
  nombre_archivo: string;
  ruta: string;
  estado: 'pendiente' | 'firmado' | 'rechazado' | string;
  subido_en: string;      // ISO string
  firmado_en: string | null;
  nombre_usuario: string;
}

export interface UsuarioActual {
  id: number;
  nombre: string;
  dni: string;
  rol: 'empleado' | 'rrhh' | string;
}

export interface MisDocumentosResponse {
  message: string;
  documentos: Documento[];
  usuario_actual: UsuarioActual;
}