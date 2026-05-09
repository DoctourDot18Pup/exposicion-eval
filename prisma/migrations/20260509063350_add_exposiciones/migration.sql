-- CreateTable
CREATE TABLE "exposiciones" (
    "id" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "equipoId" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exposiciones_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "exposiciones" ADD CONSTRAINT "exposiciones_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exposiciones" ADD CONSTRAINT "exposiciones_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
