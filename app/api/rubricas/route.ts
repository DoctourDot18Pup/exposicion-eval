import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, UnauthorizedError } from "@/lib/middleware";
import { makeApiError, type RubricaInput, type PaginatedResponse, type Rubrica } from "@/types/api";

const rubricaInclude = {
  exposicion: { select: { id: true, tema: true, fecha: true } },
  criterios: {
    select: { id: true, nombre: true, descripcion: true, ponderacion: true },
    orderBy: { createdAt: "asc" as const },
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
  const exposicionId = searchParams.get("exposicionId") ?? undefined;

  const where = exposicionId ? { exposicionId } : {};

  const [totalElements, rubricas] = await Promise.all([
    prisma.rubrica.count({ where }),
    prisma.rubrica.findMany({
      where,
      skip: page * size,
      take: size,
      orderBy: { createdAt: "desc" },
      include: rubricaInclude,
    }),
  ]);

  const response: PaginatedResponse<Rubrica> = {
    content: rubricas as unknown as Rubrica[],
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

  let body: RubricaInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El cuerpo de la petición no es JSON válido", path),
      { status: 400 }
    );
  }

  const { nombre, descripcion, exposicionId } = body;

  if (!nombre || !exposicionId) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "Los campos nombre y exposicionId son requeridos", path),
      { status: 400 }
    );
  }

  if (nombre.trim().length < 3 || nombre.trim().length > 100) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "nombre debe tener entre 3 y 100 caracteres", path),
      { status: 400 }
    );
  }

  const exposicion = await prisma.exposicion.findUnique({ where: { id: exposicionId } });
  if (!exposicion) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Exposición con id ${exposicionId} no encontrada`, path),
      { status: 404 }
    );
  }

  const yaExiste = await prisma.rubrica.findUnique({ where: { exposicionId } });
  if (yaExiste) {
    return NextResponse.json(
      makeApiError(409, "Conflict", "La exposición ya tiene una rúbrica asignada", path),
      { status: 409 }
    );
  }

  const rubrica = await prisma.rubrica.create({
    data: { nombre: nombre.trim(), descripcion: descripcion?.trim() ?? null, exposicionId },
    include: rubricaInclude,
  });

  return NextResponse.json(rubrica, { status: 201 });
}
