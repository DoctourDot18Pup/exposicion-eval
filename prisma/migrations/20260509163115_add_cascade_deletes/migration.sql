-- DropForeignKey
ALTER TABLE "alumno_equipo" DROP CONSTRAINT "alumno_equipo_alumnoId_fkey";

-- DropForeignKey
ALTER TABLE "alumno_equipo" DROP CONSTRAINT "alumno_equipo_equipoId_fkey";

-- DropForeignKey
ALTER TABLE "criterios" DROP CONSTRAINT "criterios_rubricaId_fkey";

-- DropForeignKey
ALTER TABLE "detalle_evaluacion" DROP CONSTRAINT "detalle_evaluacion_evaluacionId_fkey";

-- DropForeignKey
ALTER TABLE "evaluaciones" DROP CONSTRAINT "evaluaciones_exposicionId_fkey";

-- DropForeignKey
ALTER TABLE "rubricas" DROP CONSTRAINT "rubricas_exposicionId_fkey";

-- AddForeignKey
ALTER TABLE "rubricas" ADD CONSTRAINT "rubricas_exposicionId_fkey" FOREIGN KEY ("exposicionId") REFERENCES "exposiciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criterios" ADD CONSTRAINT "criterios_rubricaId_fkey" FOREIGN KEY ("rubricaId") REFERENCES "rubricas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_exposicionId_fkey" FOREIGN KEY ("exposicionId") REFERENCES "exposiciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_evaluacion" ADD CONSTRAINT "detalle_evaluacion_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "evaluaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumno_equipo" ADD CONSTRAINT "alumno_equipo_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumno_equipo" ADD CONSTRAINT "alumno_equipo_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
