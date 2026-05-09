import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, UnauthorizedError } from "@/lib/middleware";
import { makeApiError } from "@/types/api";

type RouteParams = { params: Promise<{ id: string; alumnoId: string }> };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: equipoId, alumnoId } = await params;
  const path = request.nextUrl.pathname;

  try {
    await getAuthUser(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) return e.response;
    throw e;
  }

  const equipo = await prisma.equipo.findUnique({ where: { id: equipoId } });
  if (!equipo) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Equipo con id ${equipoId} no encontrado`, path),
      { status: 404 }
    );
  }

  const miembro = await prisma.alumnoEquipo.findUnique({
    where: { alumnoId },
  });

  if (!miembro || miembro.equipoId !== equipoId) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `El alumno con id ${alumnoId} no es miembro de este equipo`, path),
      { status: 404 }
    );
  }

  await prisma.alumnoEquipo.delete({ where: { alumnoId } });

  return new NextResponse(null, { status: 204 });
}
