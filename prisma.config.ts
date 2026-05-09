import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
    // @ts-expect-error directUrl soportado en runtime pero ausente en tipos de Prisma v7.8
    directUrl: process.env["DIRECT_URL"],
  },
});