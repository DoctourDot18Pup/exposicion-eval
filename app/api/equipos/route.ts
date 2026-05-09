import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, UnauthorizedError } from "@/lib/middleware";
import { makeApiError, type EquipoInput, type PaginatedResponse, type Equipo } from "@/types/api";

const equipoInclude = {
  grupo: { select: { id: true, nombre_grupo: true } },
  miembros: {
    select: {
      alumno: { select: { id: true, nombre: true, apellido: true, matricula: true } },
    },
  },
};

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
  const grupoId = searchParams.get("grupoId") ?? undefined;

  const where = grupoId ? { grupoId } : {};

  const [totalElements, equipos] = await Promise.all([
    prisma.equipo.count({ where }),
    prisma.equipo.findMany({
      where,
      skip: page * size,
      take: size,
      orderBy: { createdAt: "desc" },
      include: equipoInclude,
    }),
  ]);

  const response: PaginatedResponse<Equipo> = {
    content: equipos as unknown as Equipo[],
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

  const grupo = await prisma.grupo.findUnique({ where: { id: grupoId } });
  if (!grupo) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Grupo con id ${grupoId} no encontrado`, path),
      { status: 404 }
    );
  }

  const equipo = await prisma.equipo.create({
    data: { nombre_equipo: nombre_equipo.trim(), grupoId },
    include: equipoInclude,
  });

  return NextResponse.json(equipo, { status: 201 });
}
