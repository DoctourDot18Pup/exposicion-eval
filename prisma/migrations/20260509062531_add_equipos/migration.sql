-- CreateTable
CREATE TABLE "equipos" (
    "id" TEXT NOT NULL,
    "nombre_equipo" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alumno_equipo" (
    "alumnoId" TEXT NOT NULL,
    "equipoId" TEXT NOT NULL,

    CONSTRAINT "alumno_equipo_pkey" PRIMARY KEY ("alumnoId","equipoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "alumno_equipo_alumnoId_key" ON "alumno_equipo"("alumnoId");

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumno_equipo" ADD CONSTRAINT "alumno_equipo_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "alumnos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumno_equipo" ADD CONSTRAINT "alumno_equipo_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
