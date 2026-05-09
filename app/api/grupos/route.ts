import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, UnauthorizedError } from "@/lib/middleware";
import { makeApiError, type GrupoInput, type PaginatedResponse, type Grupo } from "@/types/api";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname;

  try {
    await getAuthUser(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) return e.response;
    throw e;
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(0, Number(searchParams.get("page") ?? 0));
  const size = Math.min(100, Math.max(1, Number(searchParams.get("size") ?? 10)));
  const materiaId = searchParams.get("materiaId") ?? undefined;

  const where = materiaId ? { materiaId } : {};

  const [totalElements, grupos] = await Promise.all([
    prisma.grupo.count({ where }),
    prisma.grupo.findMany({
      where,
      skip: page * size,
      take: size,
      orderBy: { createdAt: "desc" },
      include: {
        materia: { select: { id: true, clave_materia: true, nombre_materia: true } },
        docente: { select: { id: true, username: true } },
      },
    }),
  ]);

  const response: PaginatedResponse<Grupo> = {
    content: grupos as unknown as Grupo[],
    totalElements,
    totalPages: Math.ceil(totalElements / size),
    page,
    size,
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname;

  try {
    await getAuthUser(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) return e.response;
    throw e;
  }

  let body: GrupoInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El cuerpo de la petición no es JSON válido", path),
      { status: 400 }
    );
  }

  const { nombre_grupo, materiaId, docenteId } = body;

  if (!nombre_grupo || !materiaId) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "Los campos nombre_grupo y materiaId son requeridos", path),
      { status: 400 }
    );
  }

  if (nombre_grupo.trim().length < 2 || nombre_grupo.trim().length > 50) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "nombre_grupo debe tener entre 2 y 50 caracteres", path),
      { status: 400 }
    );
  }

  const materia = await prisma.materia.findUnique({ where: { id: materiaId } });
  if (!materia) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Materia con id ${materiaId} no encontrada`, path),
      { status: 404 }
    );
  }

  if (docenteId) {
    const docente = await prisma.usuario.findUnique({ where: { id: docenteId } });
    if (!docente) {
      return NextResponse.json(
        makeApiError(404, "Not Found", `Usuario con id ${docenteId} no encontrado`, path),
        { status: 404 }
      );
    }
    if (docente.rol !== "docente") {
      return NextResponse.json(
        makeApiError(400, "Bad Request", "El usuario indicado en docenteId no tiene rol de docente", path),
        { status: 400 }
      );
    }
  }

  const grupo = await prisma.grupo.create({
    data: { nombre_grupo: nombre_grupo.trim(), materiaId, docenteId: docenteId ?? null },
    include: {
      materia: { select: { id: true, clave_materia: true, nombre_materia: true } },
      docente: { select: { id: true, username: true } },
    },
  });

  return NextResponse.json(grupo, { status: 201 });
}
