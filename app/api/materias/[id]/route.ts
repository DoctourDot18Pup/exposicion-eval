import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, UnauthorizedError } from "@/lib/middleware";
import { makeApiError, type MateriaInput } from "@/types/api";

const CLAVE_PATTERN = /^[A-Z0-9-]+$/;

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const path = request.nextUrl.pathname;

  try {
    await getAuthUser(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) return e.response;
    throw e;
  }

  const materia = await prisma.materia.findUnique({ where: { id } });

  if (!materia) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Materia con id ${id} no encontrada`, path),
      { status: 404 }
    );
  }

  return NextResponse.json(materia);
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

  let body: MateriaInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El cuerpo de la petición no es JSON válido", path),
      { status: 400 }
    );
  }

  const { clave_materia, nombre_materia } = body;

  if (!clave_materia || !nombre_materia) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "Los campos clave_materia y nombre_materia son requeridos", path),
      { status: 400 }
    );
  }

  if (!CLAVE_PATTERN.test(clave_materia)) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "clave_materia solo puede contener mayúsculas, números y guiones", path),
      { status: 400 }
    );
  }

  const existing = await prisma.materia.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Materia con id ${id} no encontrada`, path),
      { status: 404 }
    );
  }

  const claveConflict = await prisma.materia.findFirst({
    where: { clave_materia, NOT: { id } },
  });
  if (claveConflict) {
    return NextResponse.json(
      makeApiError(409, "Conflict", `Ya existe otra materia con la clave ${clave_materia}`, path),
      { status: 409 }
    );
  }

  const updated = await prisma.materia.update({
    where: { id },
    data: { clave_materia, nombre_materia },
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

  const existing = await prisma.materia.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Materia con id ${id} no encontrada`, path),
      { status: 404 }
    );
  }

  await prisma.materia.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
