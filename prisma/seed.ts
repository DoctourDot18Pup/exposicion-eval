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

  // ── Alumnos ───────────────────────────────────────────────
  const alumnosData = [
    { id: "seed-alumno-1", nombre: "Ana",    apellido: "García",    matricula: "21031001", grupoId: grupos[0].id },
    { id: "seed-alumno-2", nombre: "Luis",   apellido: "Martínez",  matricula: "21031002", grupoId: grupos[0].id },
    { id: "seed-alumno-3", nombre: "María",  apellido: "López",     matricula: "21031003", grupoId: grupos[1].id },
    { id: "seed-alumno-4", nombre: "Carlos", apellido: "Hernández", matricula: "21031004", grupoId: grupos[1].id },
    { id: "seed-alumno-5", nombre: "Sofía",  apellido: "Ramírez",   matricula: "21031005", grupoId: grupos[2].id },
  ];

  const alumnos = await Promise.all(
    alumnosData.map((a) =>
      prisma.alumno.upsert({
        where: { id: a.id },
        update: {},
        create: a,
      })
    )
  );

  console.log("Alumnos creados:", alumnos.map((a) => `${a.nombre} ${a.apellido} (${a.matricula})`));

  // ── Equipos ───────────────────────────────────────────────
  const equiposData = [
    { id: "seed-equipo-1", nombre_equipo: "Equipo Alpha", grupoId: grupos[0].id },
    { id: "seed-equipo-2", nombre_equipo: "Equipo Beta",  grupoId: grupos[0].id },
    { id: "seed-equipo-3", nombre_equipo: "Equipo Gamma", grupoId: grupos[1].id },
  ];

  const equipos = await Promise.all(
    equiposData.map((e) =>
      prisma.equipo.upsert({
        where: { id: e.id },
        update: {},
        create: e,
      })
    )
  );

  console.log("Equipos creados:", equipos.map((e) => e.nombre_equipo));

  // ── Miembros ──────────────────────────────────────────────
  const miembrosData = [
    { alumnoId: alumnos[0].id, equipoId: equipos[0].id }, // Ana → Alpha
    { alumnoId: alumnos[1].id, equipoId: equipos[1].id }, // Luis → Beta
    { alumnoId: alumnos[2].id, equipoId: equipos[2].id }, // María → Gamma
  ];

  await Promise.all(
    miembrosData.map((m) =>
      prisma.alumnoEquipo.upsert({
        where: { alumnoId: m.alumnoId },
        update: {},
        create: m,
      })
    )
  );

  console.log("Miembros asignados:", miembrosData.length);

  // ── Exposiciones ──────────────────────────────────────────
  const exposicionesData = [
    {
      id: "seed-expo-1",
      tema: "Introducción a la Herencia en Java",
      fecha: new Date("2026-06-10T09:00:00.000Z"),
      equipoId: equipos[0].id,
      grupoId: grupos[0].id,
    },
    {
      id: "seed-expo-2",
      tema: "Polimorfismo y Clases Abstractas",
      fecha: new Date("2026-06-17T09:00:00.000Z"),
      equipoId: equipos[1].id,
      grupoId: grupos[0].id,
    },
    {
      id: "seed-expo-3",
      tema: "Normalización de Bases de Datos",
      fecha: new Date("2026-06-12T10:00:00.000Z"),
      equipoId: equipos[2].id,
      grupoId: grupos[1].id,
    },
  ];

  const exposiciones = await Promise.all(
    exposicionesData.map((e) =>
      prisma.exposicion.upsert({
        where: { id: e.id },
        update: {},
        create: e,
      })
    )
  );

  console.log("Exposiciones creadas:", exposiciones.map((e) => e.tema));

  // ── Rúbricas ──────────────────────────────────────────────
  const rubrica1 = await prisma.rubrica.upsert({
    where: { id: "seed-rubrica-1" },
    update: {},
    create: {
      id: "seed-rubrica-1",
      nombre: "Rúbrica de Exposición Oral",
      descripcion: "Evalúa presentación, dominio del tema y recursos visuales",
      exposicionId: exposiciones[0].id,
    },
  });

  const rubrica2 = await prisma.rubrica.upsert({
    where: { id: "seed-rubrica-2" },
    update: {},
    create: {
      id: "seed-rubrica-2",
      nombre: "Rúbrica de Proyecto Final",
      descripcion: "Evalúa documentación, funcionalidad y defensa",
      exposicionId: exposiciones[1].id,
    },
  });

  console.log("Rúbricas creadas:", [rubrica1, rubrica2].map((r) => r.nombre));

  // ── Criterios ─────────────────────────────────────────────
  const criteriosR1 = [
    { id: "seed-criterio-1", nombre: "Presentación",     descripcion: "Claridad y fluidez al exponer", ponderacion: 30, rubricaId: rubrica1.id },
    { id: "seed-criterio-2", nombre: "Dominio del tema", descripcion: "Profundidad y precisión técnica", ponderacion: 50, rubricaId: rubrica1.id },
    { id: "seed-criterio-3", nombre: "Material visual",  descripcion: "Calidad de las diapositivas",     ponderacion: 20, rubricaId: rubrica1.id },
  ];

  const criteriosR2 = [
    { id: "seed-criterio-4", nombre: "Documentación", descripcion: "Claridad y completitud del reporte",  ponderacion: 40, rubricaId: rubrica2.id },
    { id: "seed-criterio-5", nombre: "Funcionalidad", descripcion: "El sistema cumple los requisitos",     ponderacion: 40, rubricaId: rubrica2.id },
    { id: "seed-criterio-6", nombre: "Defensa",       descripcion: "Respuestas durante el interrogatorio", ponderacion: 20, rubricaId: rubrica2.id },
  ];

  await Promise.all(
    [...criteriosR1, ...criteriosR2].map((c) =>
      prisma.criterio.upsert({
        where: { id: c.id },
        update: {},
        create: c,
      })
    )
  );

  console.log("Criterios creados:", criteriosR1.length + criteriosR2.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
