import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, UnauthorizedError } from "@/lib/middleware";
import { makeApiError } from "@/types/api";

type RouteParams = { params: Promise<{ id: string }> };

const evaluacionInclude = {
  docente: { select: { id: true, username: true } },
  exposicion: { select: { id: true, tema: true, fecha: true } },
  detalles: {
    include: {
      criterio: { select: { id: true, nombre: true, ponderacion: true } },
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

  const evaluacion = await prisma.evaluacion.findUnique({ where: { id }, include: evaluacionInclude });

  if (!evaluacion) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Evaluación con id ${id} no encontrada`, path),
      { status: 404 }
    );
  }

  return NextResponse.json(evaluacion);
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

  const existing = await prisma.evaluacion.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Evaluación con id ${id} no encontrada`, path),
      { status: 404 }
    );
  }

  await prisma.evaluacion.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
