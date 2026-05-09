import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, UnauthorizedError } from "@/lib/middleware";
import { makeApiError, type CriterioInput } from "@/types/api";

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

  const criterio = await prisma.criterio.findUnique({
    where: { id },
    include: { rubrica: { select: { id: true, nombre: true } } },
  });

  if (!criterio) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Criterio con id ${id} no encontrado`, path),
      { status: 404 }
    );
  }

  return NextResponse.json(criterio);
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

  let body: CriterioInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El cuerpo de la petición no es JSON válido", path),
      { status: 400 }
    );
  }

  const { nombre, descripcion, ponderacion } = body;

  if (!nombre || ponderacion === undefined || ponderacion === null) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "Los campos nombre y ponderacion son requeridos", path),
      { status: 400 }
    );
  }

  if (nombre.trim().length < 3 || nombre.trim().length > 100) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "nombre debe tener entre 3 y 100 caracteres", path),
      { status: 400 }
    );
  }

  if (typeof ponderacion !== "number" || ponderacion <= 0 || ponderacion > 100) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "ponderacion debe ser un número entre 0.01 y 100", path),
      { status: 400 }
    );
  }

  const existing = await prisma.criterio.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Criterio con id ${id} no encontrado`, path),
      { status: 404 }
    );
  }

  const rubrica = await prisma.rubrica.findUnique({
    where: { id: existing.rubricaId },
    include: { criterios: { select: { id: true, ponderacion: true } } },
  });

  const sumaOtros = rubrica!.criterios
    .filter((c) => c.id !== id)
    .reduce((acc, c) => acc + Number(c.ponderacion), 0);

  if (sumaOtros + ponderacion > 100) {
    return NextResponse.json(
      makeApiError(
        400,
        "Bad Request",
        `La ponderación acumulada (${sumaOtros.toFixed(2)} + ${ponderacion}) supera 100`,
        path
      ),
      { status: 400 }
    );
  }

  const updated = await prisma.criterio.update({
    where: { id },
    data: { nombre: nombre.trim(), descripcion: descripcion?.trim() ?? null, ponderacion },
    include: { rubrica: { select: { id: true, nombre: true } } },
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

  const existing = await prisma.criterio.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Criterio con id ${id} no encontrado`, path),
      { status: 404 }
    );
  }

  await prisma.criterio.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
