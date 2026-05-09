import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const SALT_ROUNDS = 10;

  // ── Usuarios ──────────────────────────────────────────────
  const docente = await prisma.usuario.upsert({
    where: { username: "docente1" },
    update: {},
    create: {
      username: "docente1",
      password_hash: await bcrypt.hash("docente123", SALT_ROUNDS),
      rol: "docente",
    },
  });

  const alumno = await prisma.usuario.upsert({
    where: { username: "alumno1" },
    update: {},
    create: {
      username: "alumno1",
      password_hash: await bcrypt.hash("alumno123", SALT_ROUNDS),
      rol: "alumno",
    },
  });

  console.log("Usuarios creados:", { docente: docente.username, alumno: alumno.username });

  // ── Materias ──────────────────────────────────────────────
  const [poo, bd, redes] = await Promise.all([
    prisma.materia.upsert({
      where: { clave_materia: "POO-2024" },
      update: {},
      create: { clave_materia: "POO-2024", nombre_materia: "Programación Orientada a Objetos" },
    }),
    prisma.materia.upsert({
      where: { clave_materia: "BD-2024" },
      update: {},
      create: { clave_materia: "BD-2024", nombre_materia: "Bases de Datos" },
    }),
    prisma.materia.upsert({
      where: { clave_materia: "REDES-2024" },
      update: {},
      create: { clave_materia: "REDES-2024", nombre_materia: "Redes de Computadoras" },
    }),
  ]);

  console.log("Materias creadas:", [poo, bd, redes].map((m) => m.clave_materia));

  // ── Grupos ────────────────────────────────────────────────
  const grupos = await Promise.all([
    prisma.grupo.upsert({
      where: { id: "seed-grupo-1" },
      update: {},
      create: {
        id: "seed-grupo-1",
        nombre_grupo: "Grupo A",
        materiaId: poo.id,
        docenteId: docente.id,
      },
    }),
    prisma.grupo.upsert({
      where: { id: "seed-grupo-2" },
      update: {},
      create: {
        id: "seed-grupo-2",
        nombre_grupo: "Grupo B",
        materiaId: bd.id,
        docenteId: docente.id,
      },
    }),
    prisma.grupo.upsert({
      where: { id: "seed-grupo-3" },
      update: {},
      create: {
        id: "seed-grupo-3",
        nombre_grupo: "Grupo C",
        materiaId: redes.id,
        docenteId: docente.id,
      },
    }),
  ]);

  console.log("Grupos creados:", grupos.map((g) => g.nombre_grupo));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
