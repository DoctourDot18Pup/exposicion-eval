import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, UnauthorizedError } from "@/lib/middleware";
import { makeApiError, type EquipoInput } from "@/types/api";

type RouteParams = { params: Promise<{ id: string }> };

const equipoInclude = {
  grupo: { select: { id: true, nombre_grupo: true } },
  miembros: {
    select: {
      alumno: { select: { id: true, nombre: true, apellido: true, matricula: true } },
    },
  },
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

  const equipo = await prisma.equipo.findUnique({ where: { id }, include: equipoInclude });

  if (!equipo) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Equipo con id ${id} no encontrado`, path),
      { status: 404 }
    );
  }

  return NextResponse.json(equipo);
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

  let body: EquipoInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El cuerpo de la petición no es JSON válido", path),
      { status: 400 }
    );
  }

  const { nombre_equipo, grupoId } = body;

  if (!nombre_equipo || !grupoId) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "Los campos nombre_equipo y grupoId son requeridos", path),
      { status: 400 }
    );
  }

  if (nombre_equipo.trim().length < 2 || nombre_equipo.trim().length > 50) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "nombre_equipo debe tener entre 2 y 50 caracteres", path),
      { status: 400 }
    );
  }

  const existing = await prisma.equipo.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Equipo con id ${id} no encontrado`, path),
      { status: 404 }
    );
  }

  const grupo = await prisma.grupo.findUnique({ where: { id: grupoId } });
  if (!grupo) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Grupo con id ${grupoId} no encontrado`, path),
      { status: 404 }
    );
  }

  const updated = await prisma.equipo.update({
    where: { id },
    data: { nombre_equipo: nombre_equipo.trim(), grupoId },
    include: equipoInclude,
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

  const existing = await prisma.equipo.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Equipo con id ${id} no encontrado`, path),
      { status: 404 }
    );
  }

  const exposiciones = await prisma.exposicion.count({ where: { equipoId: id } });
  if (exposiciones > 0) {
    return NextResponse.json(
      makeApiError(409, "Conflict", `No se puede eliminar: el equipo tiene ${exposiciones} exposición(es) registrada(s)`, path),
      { status: 409 }
    );
  }

  await prisma.equipo.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
