import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, UnauthorizedError } from "@/lib/middleware";
import { makeApiError, type ExposicionInput, type PaginatedResponse, type Exposicion } from "@/types/api";

const exposicionInclude = {
  equipo: { select: { id: true, nombre_equipo: true } },
  grupo: {
    select: {
      id: true,
      nombre_grupo: true,
      materia: { select: { id: true, clave_materia: true, nombre_materia: true } },
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
  const equipoId = searchParams.get("equipoId") ?? undefined;

  const where = {
    ...(grupoId ? { grupoId } : {}),
    ...(equipoId ? { equipoId } : {}),
  };

  const [totalElements, exposiciones] = await Promise.all([
    prisma.exposicion.count({ where }),
    prisma.exposicion.findMany({
      where,
      skip: page * size,
      take: size,
      orderBy: { fecha: "asc" },
      include: exposicionInclude,
    }),
  ]);

  const response: PaginatedResponse<Exposicion> = {
    content: exposiciones as unknown as Exposicion[],
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

  let body: ExposicionInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El cuerpo de la petición no es JSON válido", path),
      { status: 400 }
    );
  }

  const { tema, fecha, equipoId, grupoId } = body;

  if (!tema || !fecha || !equipoId || !grupoId) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "Los campos tema, fecha, equipoId y grupoId son requeridos", path),
      { status: 400 }
    );
  }

  if (tema.trim().length < 3 || tema.trim().length > 100) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "tema debe tener entre 3 y 100 caracteres", path),
      { status: 400 }
    );
  }

  const fechaDate = new Date(fecha);
  if (isNaN(fechaDate.getTime())) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "fecha debe ser una fecha ISO 8601 válida", path),
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

  const equipo = await prisma.equipo.findUnique({ where: { id: equipoId } });
  if (!equipo) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Equipo con id ${equipoId} no encontrado`, path),
      { status: 404 }
    );
  }

  if (equipo.grupoId !== grupoId) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El equipo no pertenece al grupo indicado", path),
      { status: 400 }
    );
  }

  const exposicion = await prisma.exposicion.create({
    data: { tema: tema.trim(), fecha: fechaDate, equipoId, grupoId },
    include: exposicionInclude,
  });

  return NextResponse.json(exposicion, { status: 201 });
}
