import { NextRequest, NextResponse } from "next/server";
import { type JWTPayload } from "jose";
import { verifyToken } from "@/lib/jwt";

export class UnauthorizedError extends Error {
  readonly response: NextResponse;

  constructor(message: string, path: string) {
    super(message);
    this.response = NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 401,
        error: "Unauthorized",
        message,
        path,
      },
      { status: 401 }
    );
  }
}

export async function getAuthUser(request: NextRequest): Promise<JWTPayload> {
  const authHeader = request.headers.get("Authorization");
  const path = request.nextUrl.pathname;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Token no proporcionado", path);
  }

  const token = authHeader.slice(7);

  try {
    return await verifyToken(token);
  } catch {
    throw new UnauthorizedError("Token inválido o expirado", path);
  }
}
