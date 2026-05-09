-- CreateTable
CREATE TABLE "evaluaciones" (
    "id" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "exposicionId" TEXT NOT NULL,
    "promedio_ponderado" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_evaluacion" (
    "id" TEXT NOT NULL,
    "evaluacionId" TEXT NOT NULL,
    "criterioId" TEXT NOT NULL,
    "calificacion" DECIMAL(4,2) NOT NULL,

    CONSTRAINT "detalle_evaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evaluaciones_docenteId_exposicionId_key" ON "evaluaciones"("docenteId", "exposicionId");

-- CreateIndex
CREATE UNIQUE INDEX "detalle_evaluacion_evaluacionId_criterioId_key" ON "detalle_evaluacion"("evaluacionId", "criterioId");

-- AddForeignKey
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_exposicionId_fkey" FOREIGN KEY ("exposicionId") REFERENCES "exposiciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_evaluacion" ADD CONSTRAINT "detalle_evaluacion_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "evaluaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_evaluacion" ADD CONSTRAINT "detalle_evaluacion_criterioId_fkey" FOREIGN KEY ("criterioId") REFERENCES "criterios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
