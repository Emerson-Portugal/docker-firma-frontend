// src/app/core/auth/user-storage.ts
export type AppUser = {
    id: number;
    dni: string;
    nombre: string;
    email: string;
    rol: 'rrhh' | 'empleado' | 'soporte';
    activo: boolean;
    creado_en: string;
};

export function getUserFromStorage(): AppUser | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
        // Si viene doblemente serializado, desanidar:
        const val = typeof raw === 'string' && raw.startsWith('"') ? JSON.parse(raw) : raw;
        const obj = JSON.parse(val);
        return obj as AppUser;
    } catch {
        return null;
    }
}
