import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, UnauthorizedError } from "@/lib/middleware";
import { makeApiError, type MateriaInput, type PaginatedResponse, type Materia } from "@/types/api";

const CLAVE_PATTERN = /^[A-Z0-9-]+$/;

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

  const [totalElements, materias] = await Promise.all([
    prisma.materia.count(),
    prisma.materia.findMany({
      skip: page * size,
      take: size,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalPages = Math.ceil(totalElements / size);

  const response: PaginatedResponse<Materia> = {
    content: materias,
    totalElements,
    totalPages,
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

  const existing = await prisma.materia.findUnique({ where: { clave_materia } });
  if (existing) {
    return NextResponse.json(
      makeApiError(409, "Conflict", `Ya existe una materia con la clave ${clave_materia}`, path),
      { status: 409 }
    );
  }

  const materia = await prisma.materia.create({
    data: { clave_materia, nombre_materia },
  });

  return NextResponse.json(materia, { status: 201 });
}
