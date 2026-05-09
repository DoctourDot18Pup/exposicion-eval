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
