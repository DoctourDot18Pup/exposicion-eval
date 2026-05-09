import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { makeApiError, type LoginRequest, type LoginResponse } from "@/types/api";

export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname;

  let body: LoginRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "El cuerpo de la petición no es JSON válido", path),
      { status: 400 }
    );
  }

  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json(
      makeApiError(400, "Bad Request", "Los campos username y password son requeridos", path),
      { status: 400 }
    );
  }

  const usuario = await prisma.usuario.findUnique({ where: { username } });

  if (!usuario) {
    return NextResponse.json(
      makeApiError(401, "Unauthorized", "Credenciales incorrectas", path),
      { status: 401 }
    );
  }

  const passwordMatch = await bcrypt.compare(password, usuario.password_hash);

  if (!passwordMatch) {
    return NextResponse.json(
      makeApiError(401, "Unauthorized", "Credenciales incorrectas", path),
      { status: 401 }
    );
  }

  const expiresIn = Number(process.env.JWT_EXPIRES_IN ?? 86400);

  const token = await signToken({
    sub: usuario.id,
    username: usuario.username,
    rol: usuario.rol,
  });

  const response: LoginResponse = {
    token,
    expiresIn,
    tokenType: "Bearer",
  };

  return NextResponse.json(response, { status: 200 });
}
