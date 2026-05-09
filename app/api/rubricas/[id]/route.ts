import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, UnauthorizedError } from "@/lib/middleware";
import { makeApiError, type RubricaInput } from "@/types/api";

type RouteParams = { params: Promise<{ id: string }> };

const rubricaInclude = {
  exposicion: { select: { id: true, tema: true, fecha: true } },
  criterios: {
    select: { id: true, nombre: true, descripcion: true, ponderacion: true },
    orderBy: { createdAt: "asc" as const },
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

  const rubrica = await prisma.rubrica.findUnique({ where: { id }, include: rubricaInclude });

  if (!rubrica) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Rúbrica con id ${id} no encontrada`, path),
      { status: 404 }
    );
  }

  return NextResponse.json(rubrica);
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

  let body: RubricaInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El cuerpo de la petición no es JSON válido", path),
      { status: 400 }
    );
  }

  const { nombre, descripcion } = body;

  if (!nombre) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El campo nombre es requerido", path),
      { status: 400 }
    );
  }

  if (nombre.trim().length < 3 || nombre.trim().length > 100) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "nombre debe tener entre 3 y 100 caracteres", path),
      { status: 400 }
    );
  }

  const existing = await prisma.rubrica.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Rúbrica con id ${id} no encontrada`, path),
      { status: 404 }
    );
  }

  const updated = await prisma.rubrica.update({
    where: { id },
    data: { nombre: nombre.trim(), descripcion: descripcion?.trim() ?? null },
    include: rubricaInclude,
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

  const existing = await prisma.rubrica.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Rúbrica con id ${id} no encontrada`, path),
      { status: 404 }
    );
  }

  const evaluaciones = await prisma.evaluacion.count({ where: { exposicionId: existing.exposicionId } });
  if (evaluaciones > 0) {
    return NextResponse.json(
      makeApiError(409, "Conflict", `No se puede eliminar: la exposición ya tiene ${evaluaciones} evaluación(es) registrada(s)`, path),
      { status: 409 }
    );
  }

  await prisma.rubrica.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
