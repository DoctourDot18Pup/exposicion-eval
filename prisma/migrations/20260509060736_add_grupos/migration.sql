-- CreateTable
CREATE TABLE "grupos" (
    "id" TEXT NOT NULL,
    "nombre_grupo" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "docenteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grupos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
