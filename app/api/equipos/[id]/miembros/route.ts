import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, UnauthorizedError } from "@/lib/middleware";
import { makeApiError, type MiembroInput } from "@/types/api";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: equipoId } = await params;
  const path = request.nextUrl.pathname;

  try {
    await getAuthUser(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) return e.response;
    throw e;
  }

  let body: MiembroInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El cuerpo de la petición no es JSON válido", path),
      { status: 400 }
    );
  }

  const { alumnoId } = body;

  if (!alumnoId) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El campo alumnoId es requerido", path),
      { status: 400 }
    );
  }

  const equipo = await prisma.equipo.findUnique({ where: { id: equipoId } });
  if (!equipo) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Equipo con id ${equipoId} no encontrado`, path),
      { status: 404 }
    );
  }

  const alumno = await prisma.alumno.findUnique({ where: { id: alumnoId } });
  if (!alumno) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Alumno con id ${alumnoId} no encontrado`, path),
      { status: 404 }
    );
  }

  if (alumno.grupoId !== equipo.grupoId) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El alumno no pertenece al mismo grupo que el equipo", path),
      { status: 400 }
    );
  }

  const yaEnEquipo = await prisma.alumnoEquipo.findUnique({ where: { alumnoId } });
  if (yaEnEquipo) {
    return NextResponse.json(
      makeApiError(409, "Conflict", "El alumno ya pertenece a un equipo en este grupo", path),
      { status: 409 }
    );
  }

  const miembro = await prisma.alumnoEquipo.create({
    data: { alumnoId, equipoId },
    include: {
      alumno: { select: { id: true, nombre: true, apellido: true, matricula: true } },
      equipo: { select: { id: true, nombre_equipo: true } },
    },
  });

  return NextResponse.json(miembro, { status: 201 });
}
