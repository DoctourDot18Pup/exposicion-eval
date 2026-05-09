export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  tokenType: string;
}

// ── Materia ──────────────────────────────────────────────
export interface MateriaInput {
  clave_materia: string;
  nombre_materia: string;
}

export interface Materia {
  id: string;
  clave_materia: string;
  nombre_materia: string;
  createdAt: Date;
}

// ── Grupo ─────────────────────────────────────────────────
export interface GrupoInput {
  nombre_grupo: string;
  materiaId: string;
  docenteId?: string;
}

export interface Grupo {
  id: string;
  nombre_grupo: string;
  materiaId: string;
  docenteId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Alumno ────────────────────────────────────────────────
export interface AlumnoInput {
  nombre: string;
  apellido: string;
  matricula: string;
  grupoId: string;
}

export interface Alumno {
  id: string;
  nombre: string;
  apellido: string;
  matricula: string;
  grupoId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Helper ────────────────────────────────────────────────
export function makeApiError(
  status: number,
  error: string,
  message: string,
  path: string
): ApiError {
  return {
    timestamp: new Date().toISOString(),
    status,
    error,
    message,
    path,
  };
}
