import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, UnauthorizedError } from "@/lib/middleware";
import { makeApiError, type AlumnoInput } from "@/types/api";

type RouteParams = { params: Promise<{ id: string }> };

const alumnoInclude = {
  grupo: {
    select: {
      id: true,
      nombre_grupo: true,
      materia: { select: { id: true, clave_materia: true, nombre_materia: true } },
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

  const alumno = await prisma.alumno.findUnique({ where: { id }, include: alumnoInclude });

  if (!alumno) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Alumno con id ${id} no encontrado`, path),
      { status: 404 }
    );
  }

  return NextResponse.json(alumno);
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

  let body: AlumnoInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El cuerpo de la petición no es JSON válido", path),
      { status: 400 }
    );
  }

  const { nombre, apellido, matricula, grupoId } = body;

  if (!nombre || !apellido || !matricula || !grupoId) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "Los campos nombre, apellido, matricula y grupoId son requeridos", path),
      { status: 400 }
    );
  }

  if (nombre.trim().length < 2 || nombre.trim().length > 50) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "nombre debe tener entre 2 y 50 caracteres", path),
      { status: 400 }
    );
  }

  if (apellido.trim().length < 2 || apellido.trim().length > 50) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "apellido debe tener entre 2 y 50 caracteres", path),
      { status: 400 }
    );
  }

  if (!/^[A-Za-z0-9]{5,20}$/.test(matricula.trim())) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "matricula debe tener entre 5 y 20 caracteres alfanuméricos", path),
      { status: 400 }
    );
  }

  const existing = await prisma.alumno.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Alumno con id ${id} no encontrado`, path),
      { status: 404 }
    );
  }

  const grupo = await prisma.grupo.findUnique({ where: { id: grupoId } });
  if (!grupo) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Grupo con id ${grupoId} no encontrado`, path),
      { status: 404 }
    );
  }

  if (matricula.trim() !== existing.matricula) {
    const duplicate = await prisma.alumno.findUnique({ where: { matricula: matricula.trim() } });
    if (duplicate) {
      return NextResponse.json(
        makeApiError(409, "Conflict", `Ya existe un alumno con matrícula ${matricula.trim()}`, path),
        { status: 409 }
      );
    }
  }

  const updated = await prisma.alumno.update({
    where: { id },
    data: {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      matricula: matricula.trim(),
      grupoId,
    },
    include: alumnoInclude,
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

  const existing = await prisma.alumno.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Alumno con id ${id} no encontrado`, path),
      { status: 404 }
    );
  }

  await prisma.alumno.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
