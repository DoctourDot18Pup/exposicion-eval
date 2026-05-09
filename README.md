# exposicion-eval — Backend API

Sistema de gestión de exposiciones académicas del TecNM. Permite a docentes gestionar
materias, grupos, alumnos, equipos, exposiciones y rúbricas ponderadas.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Route Handlers) |
| ORM | Prisma 7 |
| Base de datos | PostgreSQL via Supabase (pgBouncer) |
| Auth | JWT con `jose` (HS256) |
| Despliegue | Vercel |

---

## Variables de entorno

Copia `.env.example` a `.env` y rellena los valores:

```env
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
JWT_SECRET=<minimo-32-caracteres-aleatorios>
JWT_EXPIRES_IN=86400
```

- `DATABASE_URL`: conexión con pgBouncer en Transaction mode (puerto 6543).
- `DIRECT_URL`: conexión directa sin pooler (puerto 5432), usada solo para `prisma migrate dev`.
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

# 4. Ejecutar migraciones (requiere DIRECT_URL)
npx prisma migrate dev --name init

# 5. Poblar la base de datos con datos de prueba
npx prisma db seed
```

---

## Endpoints — Fase 1

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | No | Obtiene JWT con username/password |
| `GET` | `/api/materias` | Bearer | Lista paginada de materias |
| `POST` | `/api/materias` | Bearer | Crea una materia |
| `GET` | `/api/materias/:id` | Bearer | Obtiene una materia por ID |
| `PUT` | `/api/materias/:id` | Bearer | Actualiza una materia |
| `DELETE` | `/api/materias/:id` | Bearer | Elimina una materia (204) |

### Formato de error estándar

```json
{
  "timestamp": "2025-05-08T12:00:00.000Z",
  "status": 404,
  "error": "Not Found",
  "message": "Materia con id abc123 no encontrada",
  "path": "/api/materias/abc123"
}
```

### Query params de paginación (GET /api/materias)

| Param | Default | Límites |
|-------|---------|---------|
| `page` | `0` | min 0 |
| `size` | `10` | min 1, max 100 |

---

## Credenciales del seed

| Username | Password | Rol |
|----------|----------|-----|
| `docente1` | `docente123` | docente |
| `alumno1` | `alumno123` | alumno |

---

## Despliegue en Vercel

1. Importa el repositorio en [vercel.com](https://vercel.com).
2. En **Settings → Environment Variables**, agrega:
   - `DATABASE_URL` (con `?pgbouncer=true&connection_limit=1`)
   - `DIRECT_URL` (sin pgBouncer)
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
3. En **Settings → Build & Development Settings**, el build command es `next build` (predeterminado).
4. Vercel ejecuta `prisma generate` automáticamente si detecta Prisma.
   Si no, agrega al script de build: `prisma generate && next build`.
5. Las migraciones **no** se ejecutan automáticamente en Vercel; córrelas localmente con tu `DIRECT_URL` antes de desplegar.

---

## Próximas fases

| Fase | Módulos |
|------|---------|
| 2 | Grupos (CRUD) — relación Materia→Grupo |
| 3 | Alumnos (CRUD) — relación Grupo→Alumno |
| 4 | Equipos (CRUD) — relación Grupo→Equipo, Equipo↔Alumno |
| 5 | Rúbricas y criterios — rúbrica ponderada por exposición |
| 6 | Exposiciones (CRUD) — asignación a equipo/materia/grupo |
| 7 | Evaluaciones — registro por criterio, cálculo de ponderación |
| 8 | Reportes — promedios por equipo, alumno, materia |
