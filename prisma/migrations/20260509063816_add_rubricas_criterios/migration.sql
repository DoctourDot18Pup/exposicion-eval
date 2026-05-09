-- CreateTable
CREATE TABLE "rubricas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "exposicionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rubricas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criterios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "ponderacion" DECIMAL(5,2) NOT NULL,
    "rubricaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "criterios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rubricas_exposicionId_key" ON "rubricas"("exposicionId");

-- AddForeignKey
ALTER TABLE "rubricas" ADD CONSTRAINT "rubricas_exposicionId_fkey" FOREIGN KEY ("exposicionId") REFERENCES "exposiciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criterios" ADD CONSTRAINT "criterios_rubricaId_fkey" FOREIGN KEY ("rubricaId") REFERENCES "rubricas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
