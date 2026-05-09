import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, UnauthorizedError } from "@/lib/middleware";
import { makeApiError, type EvaluacionInput, type PaginatedResponse, type Evaluacion } from "@/types/api";

const evaluacionInclude = {
  docente: { select: { id: true, username: true } },
  exposicion: { select: { id: true, tema: true, fecha: true } },
  detalles: {
    include: {
      criterio: { select: { id: true, nombre: true, ponderacion: true } },
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
  const exposicionId = searchParams.get("exposicionId") ?? undefined;
  const docenteId = searchParams.get("docenteId") ?? undefined;

  const where = {
    ...(exposicionId ? { exposicionId } : {}),
    ...(docenteId ? { docenteId } : {}),
  };

  const [totalElements, evaluaciones] = await Promise.all([
    prisma.evaluacion.count({ where }),
    prisma.evaluacion.findMany({
      where,
      skip: page * size,
      take: size,
      orderBy: { createdAt: "desc" },
      include: evaluacionInclude,
    }),
  ]);

  const response: PaginatedResponse<Evaluacion> = {
    content: evaluaciones as unknown as Evaluacion[],
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

  let body: EvaluacionInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El cuerpo de la petición no es JSON válido", path),
      { status: 400 }
    );
  }

  const { docenteId, exposicionId, detalles } = body;

  if (!docenteId || !exposicionId || !Array.isArray(detalles) || detalles.length === 0) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "Los campos docenteId, exposicionId y detalles (array no vacío) son requeridos", path),
      { status: 400 }
    );
  }

  // Validar docente
  const docente = await prisma.usuario.findUnique({ where: { id: docenteId } });
  if (!docente) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Usuario con id ${docenteId} no encontrado`, path),
      { status: 404 }
    );
  }
  if (docente.rol !== "docente") {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El usuario indicado en docenteId no tiene rol de docente", path),
      { status: 400 }
    );
  }

  // Validar exposicion y su rúbrica
  const exposicion = await prisma.exposicion.findUnique({
    where: { id: exposicionId },
    include: { rubrica: { include: { criterios: true } } },
  });
  if (!exposicion) {
    return NextResponse.json(
      makeApiError(404, "Not Found", `Exposición con id ${exposicionId} no encontrada`, path),
      { status: 404 }
    );
  }
  if (!exposicion.rubrica) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "La exposición no tiene una rúbrica asignada", path),
      { status: 400 }
    );
  }

  // RN01: un docente no puede evaluar la misma exposición dos veces
  const duplicado = await prisma.evaluacion.findUnique({
    where: { docenteId_exposicionId: { docenteId, exposicionId } },
  });
  if (duplicado) {
    return NextResponse.json(
      makeApiError(409, "Conflict", "El docente ya evaluó esta exposición (RN01)", path),
      { status: 409 }
    );
  }

  const criteriosRubrica = exposicion.rubrica.criterios;
  const criterioIds = new Set(criteriosRubrica.map((c) => c.id));

  // Validar que todos los criterios de la rúbrica estén cubiertos
  const detallesCriterioIds = new Set(detalles.map((d) => d.criterioId));
  for (const cId of criterioIds) {
    if (!detallesCriterioIds.has(cId)) {
      return NextResponse.json(
        makeApiError(400, "Bad Request", `Falta calificación para el criterio con id ${cId}`, path),
        { status: 400 }
      );
    }
  }

  // Validar que no haya criterios ajenos a la rúbrica
  for (const d of detalles) {
    if (!criterioIds.has(d.criterioId)) {
      return NextResponse.json(
        makeApiError(400, "Bad Request", `El criterio con id ${d.criterioId} no pertenece a la rúbrica de esta exposición`, path),
        { status: 400 }
      );
    }
    if (typeof d.calificacion !== "number" || d.calificacion < 0 || d.calificacion > 10) {
      return NextResponse.json(
        makeApiError(400, "Bad Request", `La calificación del criterio ${d.criterioId} debe ser un número entre 0 y 10`, path),
        { status: 400 }
      );
    }
  }

  // Calcular promedio ponderado
  const ponderacionMap = new Map(criteriosRubrica.map((c) => [c.id, Number(c.ponderacion)]));
  const promedio_ponderado = detalles.reduce((acc, d) => {
    return acc + d.calificacion * (ponderacionMap.get(d.criterioId)! / 100);
  }, 0);

  // Crear evaluación con detalles en una transacción
  const evaluacion = await prisma.evaluacion.create({
    data: {
      docenteId,
      exposicionId,
      promedio_ponderado: Math.round(promedio_ponderado * 100) / 100,
      detalles: {
        create: detalles.map((d) => ({
          criterioId: d.criterioId,
          calificacion: d.calificacion,
        })),
      },
    },
    include: evaluacionInclude,
  });

  return NextResponse.json(evaluacion, { status: 201 });
}
