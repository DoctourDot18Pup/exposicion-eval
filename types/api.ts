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

// ── Equipo ────────────────────────────────────────────────
export interface EquipoInput {
  nombre_equipo: string;
  grupoId: string;
}

export interface Equipo {
  id: string;
  nombre_equipo: string;
  grupoId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MiembroInput {
  alumnoId: string;
}

// ── Exposicion ────────────────────────────────────────────
export interface ExposicionInput {
  tema: string;
  fecha: string;
  equipoId: string;
  grupoId: string;
}

export interface Exposicion {
  id: string;
  tema: string;
  fecha: Date;
  equipoId: string;
  grupoId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Rubrica ───────────────────────────────────────────────
export interface RubricaInput {
  nombre: string;
  descripcion?: string;
  exposicionId: string;
}

export interface Rubrica {
  id: string;
  nombre: string;
  descripcion: string | null;
  exposicionId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Criterio ──────────────────────────────────────────────
export interface CriterioInput {
  nombre: string;
  descripcion?: string;
  ponderacion: number;
}

export interface Criterio {
  id: string;
  nombre: string;
  descripcion: string | null;
  ponderacion: number;
  rubricaId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Evaluacion ────────────────────────────────────────────
export interface DetalleInput {
  criterioId: string;
  calificacion: number;
}

export interface EvaluacionInput {
  docenteId: string;
  exposicionId: string;
  detalles: DetalleInput[];
}

export interface Evaluacion {
  id: string;
  docenteId: string;
  exposicionId: string;
  promedio_ponderado: number;
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
