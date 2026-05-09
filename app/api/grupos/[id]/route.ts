import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, UnauthorizedError } from "@/lib/middleware";
import { makeApiError, type GrupoInput } from "@/types/api";

type RouteParams = { params: Promise<{ id: string }> };

const grupoInclude = {
  materia: { select: { id: true, clave_materia: true, nombre_materia: true } },
  docente: { select: { id: true, username: true } },
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const path = request.nextUrl.pathname;

  try {
    await getAuthUser(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) return e.response;
    throw e;
  }

  const grupo = await prisma.grupo.findUnique({ where: { id }, include: grupoInclude });

  if (!grupo) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Grupo con id ${id} no encontrado`, path),
      { status: 404 }
    );
  }

  return NextResponse.json(grupo);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
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

  const existing = await prisma.grupo.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Grupo con id ${id} no encontrado`, path),
      { status: 404 }
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

  const updated = await prisma.grupo.update({
    where: { id },
    data: { nombre_grupo: nombre_grupo.trim(), materiaId, docenteId: docenteId ?? null },
    include: grupoInclude,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const path = request.nextUrl.pathname;

  try {
    await getAuthUser(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) return e.response;
    throw e;
  }

  const existing = await prisma.grupo.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Grupo con id ${id} no encontrado`, path),
      { status: 404 }
    );
  }

  await prisma.grupo.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
