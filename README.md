# exposicion-eval — Backend API

Sistema de gestión de exposiciones académicas del TecNM. Permite a docentes gestionar
materias, grupos, alumnos, equipos, exposiciones y rúbricas ponderadas.

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

```
Usuario (docente) ──┐
                    ▼
Materia ──────── Grupo ──────── Equipo ◄──── AlumnoEquipo ◄──┐
                    │                                          │
                    └──────── Alumno ────────────────────────►┘
```

- Un **Grupo** pertenece a una **Materia** y puede tener un **Docente** asignado.
- Un **Alumno** pertenece a exactamente un **Grupo**.
- Un **Equipo** pertenece a un **Grupo**.
- Un **Alumno** puede estar en máximo un **Equipo** (unicidad en `AlumnoEquipo.alumnoId`).
- El alumno y el equipo deben pertenecer al mismo **Grupo**.

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
| `409` | Conflict — duplicado (matrícula, membresía) |

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
{
  "username": "docente1",
  "password": "docente123"
}
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
| Credenciales incorrectas | `401` — "Credenciales inválidas" |
| Falta `username` o `password` | `400` — "username y password son requeridos" |

---

### Materias

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/materias` | Lista paginada |
| `POST` | `/api/materias` | Crear materia |
| `GET` | `/api/materias/:id` | Obtener por ID |
| `PUT` | `/api/materias/:id` | Actualizar |
| `DELETE` | `/api/materias/:id` | Eliminar (204) |

#### GET /api/materias

**Response 200:**
```json
{
  "content": [
    {
      "id": "clx...",
      "clave_materia": "REDES-2024",
      "nombre_materia": "Redes de Computadoras",
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

**Request:**
```json
{
  "clave_materia": "ALG-2024",
  "nombre_materia": "Algoritmos y Estructuras de Datos"
}
```

**Response 201:**
```json
{
  "id": "clx...",
  "clave_materia": "ALG-2024",
  "nombre_materia": "Algoritmos y Estructuras de Datos",
  "createdAt": "2026-05-09T06:00:00.000Z",
  "updatedAt": "2026-05-09T06:00:00.000Z"
}
```

**Errores:**
| Caso | Status |
|------|--------|
| `clave_materia` o `nombre_materia` vacíos | `400` |
| `clave_materia` duplicada | `409` — "Ya existe una materia con clave..." |
| ID no encontrado | `404` |

---

### Grupos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/grupos` | Lista paginada, filtro `?materiaId=` |
| `POST` | `/api/grupos` | Crear grupo |
| `GET` | `/api/grupos/:id` | Obtener por ID |
| `PUT` | `/api/grupos/:id` | Actualizar |
| `DELETE` | `/api/grupos/:id` | Eliminar (204) |

#### GET /api/grupos

Filtro opcional: `?materiaId=<id>`

**Response 200:**
```json
{
  "content": [
    {
      "id": "seed-grupo-1",
      "nombre_grupo": "Grupo A",
      "materiaId": "clx...",
      "docenteId": "clx...",
      "createdAt": "2026-05-09T05:00:00.000Z",
      "updatedAt": "2026-05-09T05:00:00.000Z",
      "materia": {
        "id": "clx...",
        "clave_materia": "POO-2024",
        "nombre_materia": "Programación Orientada a Objetos"
      },
      "docente": {
        "id": "clx...",
        "username": "docente1"
      }
    }
  ],
  "totalElements": 3,
  "totalPages": 1,
  "page": 0,
  "size": 10
}
```

#### POST /api/grupos

**Request:**
```json
{
  "nombre_grupo": "Grupo D",
  "materiaId": "<id-de-materia>",
  "docenteId": "<id-de-docente>"
}
```

`docenteId` es opcional. Si se proporciona, el usuario debe tener `rol = "docente"`.

**Response 201:** mismo objeto con `materia` y `docente` anidados.

**Errores:**
| Caso | Status |
|------|--------|
| `nombre_grupo` fuera de 2–50 caracteres | `400` |
| `materiaId` no existe | `404` |
| `docenteId` con rol alumno | `400` — "no tiene rol de docente" |
| `docenteId` no existe | `404` |

---

### Alumnos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/alumnos` | Lista paginada, filtro `?grupoId=` |
| `POST` | `/api/alumnos` | Crear alumno |
| `GET` | `/api/alumnos/:id` | Obtener por ID |
| `PUT` | `/api/alumnos/:id` | Actualizar |
| `DELETE` | `/api/alumnos/:id` | Eliminar (204) |

#### GET /api/alumnos

Filtro opcional: `?grupoId=<id>`

**Response 200:**
```json
{
  "content": [
    {
      "id": "seed-alumno-1",
      "nombre": "Ana",
      "apellido": "García",
      "matricula": "21031001",
      "grupoId": "seed-grupo-1",
      "createdAt": "2026-05-09T06:00:00.000Z",
      "updatedAt": "2026-05-09T06:00:00.000Z",
      "grupo": {
        "id": "seed-grupo-1",
        "nombre_grupo": "Grupo A",
        "materia": {
          "id": "clx...",
          "clave_materia": "POO-2024",
          "nombre_materia": "Programación Orientada a Objetos"
        }
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

**Request:**
```json
{
  "nombre": "Pedro",
  "apellido": "Sánchez",
  "matricula": "21031006",
  "grupoId": "<id-de-grupo>"
}
```

**Response 201:** alumno con `grupo` y su `materia` anidados.

**Errores:**
| Caso | Status |
|------|--------|
| Algún campo requerido faltante | `400` |
| `nombre` o `apellido` fuera de 2–50 caracteres | `400` |
| `matricula` fuera de 5–20 caracteres alfanuméricos | `400` |
| `matricula` ya registrada | `409` — "Ya existe un alumno con matrícula..." |
| `grupoId` no existe | `404` |

---

### Equipos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/equipos` | Lista paginada, filtro `?grupoId=` |
| `POST` | `/api/equipos` | Crear equipo |
| `GET` | `/api/equipos/:id` | Obtener por ID con miembros |
| `PUT` | `/api/equipos/:id` | Actualizar |
| `DELETE` | `/api/equipos/:id` | Eliminar (204) |
| `POST` | `/api/equipos/:id/miembros` | Agregar alumno al equipo |
| `DELETE` | `/api/equipos/:id/miembros/:alumnoId` | Quitar alumno del equipo (204) |

#### GET /api/equipos

Filtro opcional: `?grupoId=<id>`

**Response 200:**
```json
{
  "content": [
    {
      "id": "seed-equipo-1",
      "nombre_equipo": "Equipo Alpha",
      "grupoId": "seed-grupo-1",
      "createdAt": "2026-05-09T06:00:00.000Z",
      "updatedAt": "2026-05-09T06:00:00.000Z",
      "grupo": { "id": "seed-grupo-1", "nombre_grupo": "Grupo A" },
      "miembros": [
        {
          "alumno": {
            "id": "seed-alumno-1",
            "nombre": "Ana",
            "apellido": "García",
            "matricula": "21031001"
          }
        }
      ]
    }
  ],
  "totalElements": 3,
  "totalPages": 1,
  "page": 0,
  "size": 10
}
```

#### POST /api/equipos

**Request:**
```json
{
  "nombre_equipo": "Equipo Delta",
  "grupoId": "<id-de-grupo>"
}
```

**Response 201:** equipo con `grupo` y `miembros: []`.

#### POST /api/equipos/:id/miembros

**Request:**
```json
{
  "alumnoId": "<id-de-alumno>"
}
```

**Response 201:**
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
| `grupoId` no existe | `404` |
| `alumnoId` no existe | `404` |
| Alumno pertenece a otro grupo | `400` — "no pertenece al mismo grupo que el equipo" |
| Alumno ya tiene equipo asignado | `409` — "ya pertenece a un equipo en este grupo" |

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
| id | nombre_equipo | grupo | miembros |
|----|--------------|-------|---------|
| seed-equipo-1 | Equipo Alpha | Grupo A | Ana García |
| seed-equipo-2 | Equipo Beta | Grupo A | Luis Martínez |
| seed-equipo-3 | Equipo Gamma | Grupo B | María López |

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
