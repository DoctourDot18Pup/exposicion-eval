# exposicion-eval — Backend API

Sistema de gestión de exposiciones académicas del TecNM. Permite a docentes gestionar
materias, grupos, alumnos, equipos, exposiciones, rúbricas ponderadas y evaluaciones.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router, Route Handlers) |
| ORM | Prisma 7 |
| Base de datos | PostgreSQL via Supabase (pgBouncer) |
| Auth | JWT con `jose` (HS256) |
| Despliegue | Vercel |

URL de producción: `https://exposicion-eval.vercel.app`

---

## Variables de entorno

Copia `.env.example` a `.env` y rellena los valores:

```env
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
JWT_SECRET=<minimo-32-caracteres-aleatorios>
JWT_EXPIRES_IN=86400
```

- `DATABASE_URL`: conexión con pgBouncer en Transaction mode (puerto 6543), usada en runtime.
- `DIRECT_URL`: conexión directa sin pooler (puerto 5432), requerida para `prisma migrate dev`.
- `JWT_SECRET`: genera uno seguro con `openssl rand -base64 32`.

---

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales de Supabase

# 3. Generar el cliente Prisma
npx prisma generate

# 4. Ejecutar migraciones
#    pgBouncer bloquea DDL, se necesita la URL directa
DATABASE_URL=<DIRECT_URL> npx prisma migrate dev

# Windows PowerShell:
# $env:DATABASE_URL="<DIRECT_URL>"; npx prisma migrate dev

# 5. Poblar la base de datos con datos de prueba
npx prisma db seed
```

---

## Credenciales del seed

| Username | Password | Rol |
|----------|----------|-----|
| `docente1` | `docente123` | docente |
| `alumno1` | `alumno123` | alumno |

---

## Modelo de datos

```mermaid
erDiagram
    USUARIOS ||--o{ GRUPOS : "imparte (docente)"
    USUARIOS ||--o{ EVALUACIONES : "realiza (docente)"
    MATERIAS ||--o{ GRUPOS : "tiene"
    GRUPOS ||--o{ ALUMNOS : "contiene"
    GRUPOS ||--o{ EQUIPOS : "tiene"
    GRUPOS ||--o{ EXPOSICIONES : "tiene"
    EQUIPOS ||--o{ ALUMNO_EQUIPO : "agrupa"
    ALUMNOS ||--o| ALUMNO_EQUIPO : "pertenece a uno"
    EQUIPOS ||--o{ EXPOSICIONES : "presenta"
    EXPOSICIONES ||--o| RUBRICAS : "tiene una"
    RUBRICAS ||--o{ CRITERIOS : "contiene"
    EXPOSICIONES ||--o{ EVALUACIONES : "recibe"
    EVALUACIONES ||--o{ DETALLE_EVALUACION : "contiene"
    CRITERIOS ||--o{ DETALLE_EVALUACION : "califica"
```

**Reglas de negocio:**
- Un **Alumno** pertenece a exactamente un **Grupo**.
- Un **Alumno** puede estar en máximo un **Equipo** (el equipo y el alumno deben ser del mismo grupo).
- Una **Exposicion** pertenece a un **Equipo** y un **Grupo**; el equipo debe pertenecer a ese grupo.
- Una **Exposicion** tiene máximo una **Rubrica**.
- La suma de `ponderacion` de los **Criterios** de una rúbrica no puede superar 100.
- **RN01**: un docente no puede evaluar la misma exposición dos veces (`409 Conflict`).
- Una **Evaluacion** requiere calificación (0–10) para **todos** los criterios de la rúbrica.
- `promedio_ponderado` = Σ (calificacion_i × ponderacion_i / 100).

---

## Diagrama de flujo

Flujo completo desde el inicio de un semestre hasta el registro de una evaluación:

```mermaid
flowchart TD
    A([Inicio]) --> B[POST /api/auth/login]
    B --> C[POST /api/materias]
    C --> D[POST /api/grupos\nvincula materia + docente]
    D --> E[POST /api/alumnos\npor cada alumno del grupo]
    E --> F[POST /api/equipos\npor cada equipo del grupo]
    F --> G[POST /api/equipos/:id/miembros\nasigna alumnos a equipos]
    G --> H[POST /api/exposiciones\ntema + fecha + equipo + grupo]
    H --> I[POST /api/rubricas\nvincula a la exposicion]
    I --> J[POST /api/rubricas/:id/criterios\npor cada criterio — suma ponderacion <= 100]
    J --> K{¿Suma = 100?}
    K -- No --> J
    K -- Sí --> L[POST /api/evaluaciones\ncalificacion 0-10 por criterio]
    L --> M{¿RN01 violado?}
    M -- Sí --> N([409 Conflict])
    M -- No --> O([201 — promedio_ponderado calculado])
```

---

## Diseño de la base de datos

### `usuarios`
| Columna | Tipo | Restricciones |
|---------|------|--------------|
| id | TEXT | PK, CUID |
| username | TEXT | UNIQUE NOT NULL |
| password_hash | TEXT | NOT NULL |
| rol | ENUM(docente, alumno) | NOT NULL |
| createdAt | TIMESTAMP | DEFAULT now() |

### `materias`
| Columna | Tipo | Restricciones |
|---------|------|--------------|
| id | TEXT | PK, CUID |
| clave_materia | TEXT | UNIQUE NOT NULL |
| nombre_materia | TEXT | NOT NULL |
| createdAt | TIMESTAMP | DEFAULT now() |
| updatedAt | TIMESTAMP | AUTO |

### `grupos`
| Columna | Tipo | Restricciones |
|---------|------|--------------|
| id | TEXT | PK, CUID |
| nombre_grupo | TEXT | NOT NULL |
| materiaId | TEXT | FK → materias.id NOT NULL |
| docenteId | TEXT | FK → usuarios.id NULLABLE |
| createdAt | TIMESTAMP | DEFAULT now() |
| updatedAt | TIMESTAMP | AUTO |

### `alumnos`
| Columna | Tipo | Restricciones |
|---------|------|--------------|
| id | TEXT | PK, CUID |
| nombre | TEXT | NOT NULL |
| apellido | TEXT | NOT NULL |
| matricula | TEXT | UNIQUE NOT NULL |
| grupoId | TEXT | FK → grupos.id NOT NULL |
| createdAt | TIMESTAMP | DEFAULT now() |
| updatedAt | TIMESTAMP | AUTO |

### `equipos`
| Columna | Tipo | Restricciones |
|---------|------|--------------|
| id | TEXT | PK, CUID |
| nombre_equipo | TEXT | NOT NULL |
| grupoId | TEXT | FK → grupos.id NOT NULL |
| createdAt | TIMESTAMP | DEFAULT now() |
| updatedAt | TIMESTAMP | AUTO |

### `alumno_equipo`
| Columna | Tipo | Restricciones |
|---------|------|--------------|
| alumnoId | TEXT | PK, UNIQUE, FK → alumnos.id |
| equipoId | TEXT | PK, FK → equipos.id |

> La unicidad en `alumnoId` garantiza que cada alumno pertenezca a máximo un equipo.

### `exposiciones`
| Columna | Tipo | Restricciones |
|---------|------|--------------|
| id | TEXT | PK, CUID |
| tema | TEXT | NOT NULL |
| fecha | TIMESTAMP | NOT NULL |
| equipoId | TEXT | FK → equipos.id NOT NULL |
| grupoId | TEXT | FK → grupos.id NOT NULL |
| createdAt | TIMESTAMP | DEFAULT now() |
| updatedAt | TIMESTAMP | AUTO |

### `rubricas`
| Columna | Tipo | Restricciones |
|---------|------|--------------|
| id | TEXT | PK, CUID |
| nombre | TEXT | NOT NULL |
| descripcion | TEXT | NULLABLE |
| exposicionId | TEXT | FK → exposiciones.id UNIQUE NOT NULL |
| createdAt | TIMESTAMP | DEFAULT now() |
| updatedAt | TIMESTAMP | AUTO |

### `criterios`
| Columna | Tipo | Restricciones |
|---------|------|--------------|
| id | TEXT | PK, CUID |
| nombre | TEXT | NOT NULL |
| descripcion | TEXT | NULLABLE |
| ponderacion | DECIMAL(5,2) | NOT NULL, validado ≤ 100 acumulado |
| rubricaId | TEXT | FK → rubricas.id NOT NULL |
| createdAt | TIMESTAMP | DEFAULT now() |
| updatedAt | TIMESTAMP | AUTO |

### `evaluaciones`
| Columna | Tipo | Restricciones |
|---------|------|--------------|
| id | TEXT | PK, CUID |
| docenteId | TEXT | FK → usuarios.id NOT NULL |
| exposicionId | TEXT | FK → exposiciones.id NOT NULL |
| promedio_ponderado | DECIMAL(5,2) | NOT NULL, calculado |
| createdAt | TIMESTAMP | DEFAULT now() |
| updatedAt | TIMESTAMP | AUTO |
| — | — | UNIQUE(docenteId, exposicionId) — RN01 |

### `detalle_evaluacion`
| Columna | Tipo | Restricciones |
|---------|------|--------------|
| id | TEXT | PK, CUID |
| evaluacionId | TEXT | FK → evaluaciones.id NOT NULL |
| criterioId | TEXT | FK → criterios.id NOT NULL |
| calificacion | DECIMAL(4,2) | NOT NULL, 0–10 |
| — | — | UNIQUE(evaluacionId, criterioId) |

---

## Simulación de uso

Escenario: el docente abre el semestre de POO, registra alumnos, forma equipos, define la rúbrica de su primera exposición y registra la evaluación.

### 1 — Autenticación
```
POST /api/auth/login
{ "username": "docente1", "password": "docente123" }

→ 200 { "token": "eyJ...", "expiresIn": 86400, "tokenType": "Bearer" }
```
Guarda el token. Todos los siguientes requests usan `Authorization: Bearer <token>`.

---

### 2 — Crear la materia
```
POST /api/materias
{ "clave_materia": "POO-2024", "nombre_materia": "Programación Orientada a Objetos" }

→ 201 { "id": "mat-001", "clave_materia": "POO-2024", ... }
```

---

### 3 — Crear el grupo y asignar al docente
```
POST /api/grupos
{ "nombre_grupo": "Grupo A", "materiaId": "mat-001", "docenteId": "<id-docente1>" }

→ 201 { "id": "grp-001", "nombre_grupo": "Grupo A", "materia": {...}, "docente": {...} }
```

---

### 4 — Registrar alumnos
```
POST /api/alumnos
{ "nombre": "Ana", "apellido": "García", "matricula": "21031001", "grupoId": "grp-001" }
→ 201 { "id": "alm-001", ... }

POST /api/alumnos
{ "nombre": "Luis", "apellido": "Martínez", "matricula": "21031002", "grupoId": "grp-001" }
→ 201 { "id": "alm-002", ... }
```

---

### 5 — Crear equipo y asignar miembros
```
POST /api/equipos
{ "nombre_equipo": "Equipo Alpha", "grupoId": "grp-001" }
→ 201 { "id": "eqp-001", "miembros": [] }

POST /api/equipos/eqp-001/miembros
{ "alumnoId": "alm-001" }
→ 201 { "alumnoId": "alm-001", "equipoId": "eqp-001", ... }

POST /api/equipos/eqp-001/miembros
{ "alumnoId": "alm-002" }
→ 409 Conflict — "alm-002 ya pertenece a un equipo"
  (alm-002 fue asignado a Equipo Beta anteriormente)
```

---

### 6 — Registrar la exposición
```
POST /api/exposiciones
{
  "tema": "Introducción a la Herencia en Java",
  "fecha": "2026-06-10T09:00:00.000Z",
  "equipoId": "eqp-001",
  "grupoId": "grp-001"
}
→ 201 { "id": "exp-001", "tema": "Introducción a la Herencia en Java", ... }
```

---

### 7 — Crear rúbrica y criterios (suma = 100%)
```
POST /api/rubricas
{ "nombre": "Rúbrica Oral", "exposicionId": "exp-001" }
→ 201 { "id": "rub-001", "criterios": [] }

POST /api/rubricas/rub-001/criterios
{ "nombre": "Presentación", "ponderacion": 30 }
→ 201 { "id": "crt-001", "ponderacion": "30.00" }

POST /api/rubricas/rub-001/criterios
{ "nombre": "Dominio del tema", "ponderacion": 50 }
→ 201 { "id": "crt-002", "ponderacion": "50.00" }

POST /api/rubricas/rub-001/criterios
{ "nombre": "Material visual", "ponderacion": 30 }
→ 400 Bad Request — "La ponderación acumulada (80.00 + 30) supera 100"

POST /api/rubricas/rub-001/criterios
{ "nombre": "Material visual", "ponderacion": 20 }
→ 201 { "id": "crt-003", "ponderacion": "20.00" }
  ✓ Suma total: 30 + 50 + 20 = 100
```

---

### 8 — Registrar evaluación (promedio calculado automáticamente)
```
POST /api/evaluaciones
{
  "docenteId": "<id-docente1>",
  "exposicionId": "exp-001",
  "detalles": [
    { "criterioId": "crt-001", "calificacion": 9 },
    { "criterioId": "crt-002", "calificacion": 8 },
    { "criterioId": "crt-003", "calificacion": 7 }
  ]
}
→ 201 {
    "promedio_ponderado": "8.10",
    ...
    "detalles": [
      { "calificacion": "9.00", "criterio": { "nombre": "Presentación",     "ponderacion": "30.00" } },
      { "calificacion": "8.00", "criterio": { "nombre": "Dominio del tema", "ponderacion": "50.00" } },
      { "calificacion": "7.00", "criterio": { "nombre": "Material visual",  "ponderacion": "20.00" } }
    ]
  }

  Cálculo: (9 × 0.30) + (8 × 0.50) + (7 × 0.20) = 2.70 + 4.00 + 1.40 = 8.10
```

---

### 9 — Intento de doble evaluación (RN01)
```
POST /api/evaluaciones
{ "docenteId": "<id-docente1>", "exposicionId": "exp-001", "detalles": [...] }

→ 409 Conflict — "El docente ya evaluó esta exposición (RN01)"
```

---

## Formato de error estándar

Todos los errores devuelven el mismo objeto:

```json
{
  "timestamp": "2026-05-09T06:00:00.000Z",
  "status": 404,
  "error": "Not Found",
  "message": "Materia con id abc123 no encontrada",
  "path": "/api/materias/abc123"
}
```

| Status | Significado |
|--------|------------|
| `400` | Bad Request — validación fallida |
| `401` | Unauthorized — sin token o token inválido |
| `404` | Not Found — recurso no existe |
| `409` | Conflict — duplicado o RN01 |

---

## Paginación

Los endpoints de lista aceptan:

| Param | Default | Límites |
|-------|---------|---------|
| `page` | `0` | min 0 |
| `size` | `10` | min 1, max 100 |

Respuesta paginada:

```json
{
  "content": [...],
  "totalElements": 3,
  "totalPages": 1,
  "page": 0,
  "size": 10
}
```

---

## Autenticación

Todos los endpoints excepto `/api/auth/login` requieren:

```
Authorization: Bearer <token>
```

---

## Endpoints

### Auth

#### POST /api/auth/login

**Request:**
```json
{ "username": "docente1", "password": "docente123" }
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "expiresIn": 86400,
  "tokenType": "Bearer"
}
```

**Errores:**
| Caso | Status |
|------|--------|
| Credenciales incorrectas | `401` |
| Falta `username` o `password` | `400` |

---

### Materias

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/materias` | Lista paginada |
| `POST` | `/api/materias` | Crear |
| `GET` | `/api/materias/:id` | Obtener por ID |
| `PUT` | `/api/materias/:id` | Actualizar |
| `DELETE` | `/api/materias/:id` | Eliminar (204) |

#### GET /api/materias — Response 200
```json
{
  "content": [
    {
      "id": "clx...",
      "clave_materia": "POO-2024",
      "nombre_materia": "Programación Orientada a Objetos",
      "createdAt": "2026-05-09T05:00:00.000Z",
      "updatedAt": "2026-05-09T05:00:00.000Z"
    }
  ],
  "totalElements": 3,
  "totalPages": 1,
  "page": 0,
  "size": 10
}
```

#### POST /api/materias
**Request:** `{ "clave_materia": "ALG-2024", "nombre_materia": "Algoritmos y Estructuras de Datos" }`  
**Response 201:** objeto materia completo.

**Errores:**
| Caso | Status |
|------|--------|
| Campo vacío | `400` |
| `clave_materia` duplicada | `409` |
| ID no encontrado | `404` |

---

### Grupos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/grupos` | Lista paginada, filtro `?materiaId=` |
| `POST` | `/api/grupos` | Crear |
| `GET` | `/api/grupos/:id` | Obtener por ID |
| `PUT` | `/api/grupos/:id` | Actualizar |
| `DELETE` | `/api/grupos/:id` | Eliminar (204) |

#### GET /api/grupos — Response 200
```json
{
  "content": [
    {
      "id": "seed-grupo-1",
      "nombre_grupo": "Grupo A",
      "materiaId": "clx...",
      "docenteId": "clx...",
      "createdAt": "...",
      "updatedAt": "...",
      "materia": { "id": "clx...", "clave_materia": "POO-2024", "nombre_materia": "Programación Orientada a Objetos" },
      "docente": { "id": "clx...", "username": "docente1" }
    }
  ],
  "totalElements": 3,
  "totalPages": 1,
  "page": 0,
  "size": 10
}
```

#### POST /api/grupos
**Request:** `{ "nombre_grupo": "Grupo D", "materiaId": "<id>", "docenteId": "<id>" }` (`docenteId` opcional)  
**Response 201:** grupo con `materia` y `docente` anidados.

**Errores:**
| Caso | Status |
|------|--------|
| `nombre_grupo` fuera de 2–50 caracteres | `400` |
| `materiaId` o `docenteId` no existe | `404` |
| `docenteId` con rol alumno | `400` |

---

### Alumnos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/alumnos` | Lista paginada, filtro `?grupoId=` |
| `POST` | `/api/alumnos` | Crear |
| `GET` | `/api/alumnos/:id` | Obtener por ID |
| `PUT` | `/api/alumnos/:id` | Actualizar |
| `DELETE` | `/api/alumnos/:id` | Eliminar (204) |

#### GET /api/alumnos — Response 200
```json
{
  "content": [
    {
      "id": "seed-alumno-1",
      "nombre": "Ana",
      "apellido": "García",
      "matricula": "21031001",
      "grupoId": "seed-grupo-1",
      "createdAt": "...",
      "updatedAt": "...",
      "grupo": {
        "id": "seed-grupo-1",
        "nombre_grupo": "Grupo A",
        "materia": { "id": "clx...", "clave_materia": "POO-2024", "nombre_materia": "Programación Orientada a Objetos" }
      }
    }
  ],
  "totalElements": 5,
  "totalPages": 1,
  "page": 0,
  "size": 10
}
```

#### POST /api/alumnos
**Request:** `{ "nombre": "Pedro", "apellido": "Sánchez", "matricula": "21031006", "grupoId": "<id>" }`  
**Response 201:** alumno con `grupo` y `materia` anidados.

**Errores:**
| Caso | Status |
|------|--------|
| Campo requerido faltante | `400` |
| `nombre` o `apellido` fuera de 2–50 caracteres | `400` |
| `matricula` fuera de 5–20 caracteres alfanuméricos | `400` |
| `matricula` duplicada | `409` |
| `grupoId` no existe | `404` |

---

### Equipos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/equipos` | Lista paginada, filtro `?grupoId=` |
| `POST` | `/api/equipos` | Crear |
| `GET` | `/api/equipos/:id` | Obtener por ID con miembros |
| `PUT` | `/api/equipos/:id` | Actualizar |
| `DELETE` | `/api/equipos/:id` | Eliminar (204) |
| `POST` | `/api/equipos/:id/miembros` | Agregar alumno |
| `DELETE` | `/api/equipos/:id/miembros/:alumnoId` | Quitar alumno (204) |

#### GET /api/equipos — Response 200
```json
{
  "content": [
    {
      "id": "seed-equipo-1",
      "nombre_equipo": "Equipo Alpha",
      "grupoId": "seed-grupo-1",
      "createdAt": "...",
      "updatedAt": "...",
      "grupo": { "id": "seed-grupo-1", "nombre_grupo": "Grupo A" },
      "miembros": [
        { "alumno": { "id": "seed-alumno-1", "nombre": "Ana", "apellido": "García", "matricula": "21031001" } }
      ]
    }
  ],
  "totalElements": 3,
  "totalPages": 1,
  "page": 0,
  "size": 10
}
```

#### POST /api/equipos/:id/miembros — Response 201
```json
{
  "alumnoId": "clx...",
  "equipoId": "clx...",
  "alumno": { "id": "clx...", "nombre": "Sofía", "apellido": "Ramírez", "matricula": "21031005" },
  "equipo": { "id": "clx...", "nombre_equipo": "Equipo Delta" }
}
```

**Errores:**
| Caso | Status |
|------|--------|
| `nombre_equipo` fuera de 2–50 caracteres | `400` |
| `alumnoId` o `grupoId` no existe | `404` |
| Alumno de otro grupo | `400` — "no pertenece al mismo grupo" |
| Alumno ya tiene equipo | `409` |

---

### Exposiciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/exposiciones` | Lista paginada, filtros `?grupoId=` `?equipoId=` |
| `POST` | `/api/exposiciones` | Crear |
| `GET` | `/api/exposiciones/:id` | Obtener por ID |
| `PUT` | `/api/exposiciones/:id` | Actualizar |
| `DELETE` | `/api/exposiciones/:id` | Eliminar (204) |

#### GET /api/exposiciones — Response 200
```json
{
  "content": [
    {
      "id": "seed-expo-1",
      "tema": "Introducción a la Herencia en Java",
      "fecha": "2026-06-10T09:00:00.000Z",
      "equipoId": "seed-equipo-1",
      "grupoId": "seed-grupo-1",
      "createdAt": "...",
      "updatedAt": "...",
      "equipo": { "id": "seed-equipo-1", "nombre_equipo": "Equipo Alpha" },
      "grupo": {
        "id": "seed-grupo-1",
        "nombre_grupo": "Grupo A",
        "materia": { "id": "clx...", "clave_materia": "POO-2024", "nombre_materia": "Programación Orientada a Objetos" }
      }
    }
  ],
  "totalElements": 3,
  "totalPages": 1,
  "page": 0,
  "size": 10
}
```

#### POST /api/exposiciones
**Request:**
```json
{
  "tema": "Diseño de APIs REST",
  "fecha": "2026-06-20T10:00:00.000Z",
  "equipoId": "<id>",
  "grupoId": "<id>"
}
```
**Response 201:** exposición con `equipo` y `grupo` anidados.

**Errores:**
| Caso | Status |
|------|--------|
| `tema` fuera de 3–100 caracteres | `400` |
| `fecha` inválida (no ISO 8601) | `400` |
| `equipoId` o `grupoId` no existe | `404` |
| Equipo no pertenece al grupo | `400` |

---

### Rúbricas

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/rubricas` | Lista paginada, filtro `?exposicionId=` |
| `POST` | `/api/rubricas` | Crear (1 por exposición) |
| `GET` | `/api/rubricas/:id` | Obtener por ID con criterios |
| `PUT` | `/api/rubricas/:id` | Actualizar nombre/descripción |
| `DELETE` | `/api/rubricas/:id` | Eliminar (204) |
| `POST` | `/api/rubricas/:id/criterios` | Agregar criterio |

#### GET /api/rubricas/:id — Response 200
```json
{
  "id": "seed-rubrica-1",
  "nombre": "Rúbrica de Exposición Oral",
  "descripcion": "Evalúa presentación, dominio del tema y recursos visuales",
  "exposicionId": "seed-expo-1",
  "createdAt": "...",
  "updatedAt": "...",
  "exposicion": { "id": "seed-expo-1", "tema": "Introducción a la Herencia en Java", "fecha": "..." },
  "criterios": [
    { "id": "seed-criterio-1", "nombre": "Presentación",     "descripcion": "...", "ponderacion": "30.00" },
    { "id": "seed-criterio-2", "nombre": "Dominio del tema", "descripcion": "...", "ponderacion": "50.00" },
    { "id": "seed-criterio-3", "nombre": "Material visual",  "descripcion": "...", "ponderacion": "20.00" }
  ]
}
```

#### POST /api/rubricas
**Request:** `{ "nombre": "Rúbrica General", "descripcion": "...", "exposicionId": "<id>" }`  
**Response 201:** rúbrica con `criterios: []`.

#### POST /api/rubricas/:id/criterios — Response 201
```json
{
  "id": "clx...",
  "nombre": "Trabajo en equipo",
  "descripcion": "Coordinación del grupo",
  "ponderacion": "25.00",
  "rubricaId": "clx...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Errores:**
| Caso | Status |
|------|--------|
| `nombre` fuera de 3–100 caracteres | `400` |
| `exposicionId` no existe | `404` |
| Exposición ya tiene rúbrica | `409` |
| `ponderacion` ≤ 0 o > 100 | `400` |
| Suma de ponderaciones superaría 100 | `400` — "La ponderación acumulada (X + Y) supera 100" |

---

### Criterios

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/criterios/:id` | Obtener por ID |
| `PUT` | `/api/criterios/:id` | Actualizar (valida suma ≤ 100) |
| `DELETE` | `/api/criterios/:id` | Eliminar (204) |

#### GET /api/criterios/:id — Response 200
```json
{
  "id": "seed-criterio-1",
  "nombre": "Presentación",
  "descripcion": "Claridad y fluidez al exponer",
  "ponderacion": "30.00",
  "rubricaId": "seed-rubrica-1",
  "createdAt": "...",
  "updatedAt": "...",
  "rubrica": { "id": "seed-rubrica-1", "nombre": "Rúbrica de Exposición Oral" }
}
```

---

### Evaluaciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/evaluaciones` | Lista paginada, filtros `?exposicionId=` `?docenteId=` |
| `POST` | `/api/evaluaciones` | Crear con todos los detalles |
| `GET` | `/api/evaluaciones/:id` | Obtener por ID con detalles |
| `DELETE` | `/api/evaluaciones/:id` | Eliminar (204) |

#### POST /api/evaluaciones
**Request:**
```json
{
  "docenteId": "<id-docente>",
  "exposicionId": "<id-exposicion>",
  "detalles": [
    { "criterioId": "<id-criterio-1>", "calificacion": 9 },
    { "criterioId": "<id-criterio-2>", "calificacion": 8 },
    { "criterioId": "<id-criterio-3>", "calificacion": 7 }
  ]
}
```

**Response 201:**
```json
{
  "id": "clx...",
  "docenteId": "clx...",
  "exposicionId": "clx...",
  "promedio_ponderado": "8.10",
  "createdAt": "...",
  "updatedAt": "...",
  "docente": { "id": "clx...", "username": "docente1" },
  "exposicion": { "id": "clx...", "tema": "Introducción a la Herencia en Java", "fecha": "..." },
  "detalles": [
    {
      "id": "clx...",
      "calificacion": "9.00",
      "criterio": { "id": "clx...", "nombre": "Presentación", "ponderacion": "30.00" }
    },
    {
      "id": "clx...",
      "calificacion": "8.00",
      "criterio": { "id": "clx...", "nombre": "Dominio del tema", "ponderacion": "50.00" }
    },
    {
      "id": "clx...",
      "calificacion": "7.00",
      "criterio": { "id": "clx...", "nombre": "Material visual", "ponderacion": "20.00" }
    }
  ]
}
```

> **Cálculo del seed:** 9×0.30 + 8×0.50 + 7×0.20 = 2.70 + 4.00 + 1.40 = **8.10**

**Errores:**
| Caso | Status |
|------|--------|
| `docenteId` con rol alumno | `400` |
| `exposicionId` sin rúbrica asignada | `400` |
| Falta calificación para algún criterio | `400` — "Falta calificación para el criterio con id..." |
| Criterio ajeno a la rúbrica | `400` — "no pertenece a la rúbrica" |
| `calificacion` fuera de 0–10 | `400` |
| Docente ya evaluó esta exposición (RN01) | `409` — "El docente ya evaluó esta exposición (RN01)" |
| `docenteId` o `exposicionId` no existe | `404` |

---

## Datos del seed

### Usuarios
| username | password | rol |
|----------|----------|-----|
| docente1 | docente123 | docente |
| alumno1 | alumno123 | alumno |

### Materias
| clave_materia | nombre_materia |
|---------------|----------------|
| POO-2024 | Programación Orientada a Objetos |
| BD-2024 | Bases de Datos |
| REDES-2024 | Redes de Computadoras |

### Grupos
| id | nombre_grupo | materia | docente |
|----|-------------|---------|---------|
| seed-grupo-1 | Grupo A | POO-2024 | docente1 |
| seed-grupo-2 | Grupo B | BD-2024 | docente1 |
| seed-grupo-3 | Grupo C | REDES-2024 | docente1 |

### Alumnos
| matricula | nombre | apellido | grupo |
|-----------|--------|----------|-------|
| 21031001 | Ana | García | Grupo A |
| 21031002 | Luis | Martínez | Grupo A |
| 21031003 | María | López | Grupo B |
| 21031004 | Carlos | Hernández | Grupo B |
| 21031005 | Sofía | Ramírez | Grupo C |

### Equipos y miembros
| id | nombre_equipo | grupo | miembro del seed |
|----|--------------|-------|-----------------|
| seed-equipo-1 | Equipo Alpha | Grupo A | Ana García |
| seed-equipo-2 | Equipo Beta | Grupo A | Luis Martínez |
| seed-equipo-3 | Equipo Gamma | Grupo B | María López |

### Exposiciones
| id | tema | fecha | equipo | grupo |
|----|------|-------|--------|-------|
| seed-expo-1 | Introducción a la Herencia en Java | 2026-06-10 | Equipo Alpha | Grupo A |
| seed-expo-2 | Polimorfismo y Clases Abstractas | 2026-06-17 | Equipo Beta | Grupo A |
| seed-expo-3 | Normalización de Bases de Datos | 2026-06-12 | Equipo Gamma | Grupo B |

### Rúbricas y criterios
| rúbrica | exposición | criterio | ponderación |
|---------|-----------|---------|------------|
| Rúbrica de Exposición Oral | seed-expo-1 | Presentación | 30% |
| | | Dominio del tema | 50% |
| | | Material visual | 20% |
| Rúbrica de Proyecto Final | seed-expo-2 | Documentación | 40% |
| | | Funcionalidad | 40% |
| | | Defensa | 20% |

### Evaluación
| evaluación | docente | exposición | promedio ponderado |
|-----------|---------|-----------|-------------------|
| seed-evaluacion-1 | docente1 | seed-expo-1 | 8.10 |

---

## Despliegue en Vercel

1. Importa el repositorio en [vercel.com](https://vercel.com).
2. En **Settings → Environment Variables**, agrega:
   - `DATABASE_URL` (con `?pgbouncer=true&connection_limit=1`)
   - `DIRECT_URL`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
3. Build command: `prisma generate && next build` (ya configurado en `package.json`).
4. Las migraciones **no** se ejecutan en Vercel; córrelas localmente con `DIRECT_URL` antes de cada deploy.
